import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/service';
import { getSubscriptionBilling } from '@/lib/payments';
import type { SubscriptionInfo } from '@/lib/payments/billing.types';
import { trackServer, commonPropsFor } from '@/lib/analytics/server';
import { isPlanId, planRank, type PlanId } from '@/lib/plans/config';

/**
 * Webhook de SUSCRIPCIONES del plan (Mercado Pago, cuenta de RESSY). SEPARADO del
 * webhook de anticipos (cuenta del negocio) — no se mezclan (CLAUDE.md §3).
 *
 * MP envía dos topics: `subscription_preapproval` (alta/cambio de estado) y
 * `subscription_authorized_payment` (un cobro recurrente concreto). Ambos se
 * resuelven a un preapproval, se consulta su estado REAL (no confiamos en el
 * payload) y se sincroniza vía la función central `subscription_apply_mp_event`
 * — única autoridad del tier/estado.
 *
 * Garantías: firma válida o 401 · dedup por event_id · tier decidido por Ressy
 * (viaja en external_reference, no en MP).
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const billing = getSubscriptionBilling();

  const verdict = billing.verifyWebhook(request.headers, raw);
  console.info('[mp-sub] webhook in', { kind: verdict.kind, resourceId: verdict.resourceId, valid: verdict.valid });
  if (!verdict.valid) {
    console.warn('[mp-sub] firma inválida — revisá MP_WEBHOOK_SECRET (modo prueba vs prod)');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  if (verdict.kind === 'other' || !verdict.resourceId) {
    console.info('[mp-sub] ignorado (topic no relevante)');
    return NextResponse.json({ ok: true, ignored: true });
  }

  const db = createServiceClient();

  // Dedup del EVENTO (reintentos de MP no reprocesan). Comparte tabla con
  // anticipos; los event_id de MP son globalmente únicos.
  const { error: dupErr } = await db
    .from('payment_webhook_events')
    .insert({ provider: 'mercadopago', event_id: verdict.eventId || verdict.resourceId });
  if (dupErr) {
    if (dupErr.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    console.error('[mp-sub] dedup insert falló', { code: dupErr.code, message: dupErr.message });
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  // Resolver el preapproval: un authorized_payment referencia a su preapproval.
  let preapprovalId = verdict.resourceId;
  if (verdict.kind === 'authorized_payment') {
    try {
      const pid = await billing.preapprovalIdForPayment(verdict.resourceId);
      if (!pid) return NextResponse.json({ ok: true, ignored: true });
      preapprovalId = pid;
    } catch (e) {
      console.error('[mp-sub] preapprovalIdForPayment falló', String(e));
      return NextResponse.json({ error: 'lookup' }, { status: 500 });
    }
  }

  // Estado REAL del preapproval (con el token de Ressy).
  let info: SubscriptionInfo;
  try {
    info = await billing.getSubscription(preapprovalId);
  } catch (e) {
    console.error('[mp-sub] getSubscription falló', String(e));
    return NextResponse.json({ error: 'lookup' }, { status: 500 });
  }
  console.info('[mp-sub] preapproval', {
    businessId: info.businessId,
    tier: info.tier,
    status: info.status,
    periodEnd: info.currentPeriodEnd,
  });

  // external_reference perdido/ajeno ⇒ nada que hacer.
  if (!info.businessId) {
    console.warn('[mp-sub] sin businessId en external_reference — nada que aplicar');
    return NextResponse.json({ ok: true, ignored: true });
  }
  // Si va a quedar 'active' necesitamos el tier del ref (la RPC lo aplica solo
  // en ese caso). Sin tier ⇒ ignorar en vez de aplicar algo incoherente.
  if (info.status === 'active' && !info.tier) return NextResponse.json({ ok: true, ignored: true });

  // Tier ANTERIOR (para distinguir alta / upgrade / downgrade). Se lee antes de
  // aplicar; la RPC no lo devuelve.
  const { data: prevSub } = await db
    .from('subscriptions')
    .select('tier, is_trial')
    .eq('business_id', info.businessId)
    .maybeSingle();

  const { error } = await db.rpc('subscription_apply_mp_event', {
    p_business_id: info.businessId,
    p_tier: info.tier ?? 'free', // ignorado por la RPC si status != 'active'
    p_status: info.status,
    p_mp_preapproval_id: info.externalId,
    p_mp_payer_id: info.payerId,
    p_current_period_end: info.currentPeriodEnd,
    // Cancelado ⇒ baja al fin del período (el negocio conserva acceso hasta vencer).
    p_cancel_at_period_end: info.status === 'canceled',
  });
  if (error) {
    // Ref viejo/ajeno (negocio sin fila) ⇒ ignorar; otro error ⇒ 500 para reintento.
    if (error.message?.includes('subscription_not_found')) {
      console.warn('[mp-sub] subscription_not_found', { businessId: info.businessId });
      return NextResponse.json({ ok: true, ignored: true });
    }
    console.error('[mp-sub] apply RPC falló', { message: error.message });
    return NextResponse.json({ error: 'apply' }, { status: 500 });
  }

  console.info('[mp-sub] aplicado ✓', { businessId: info.businessId, tier: info.tier, status: info.status });

  // Analytics de monetización. El dedup del evento (arriba) garantiza que un
  // reintento del webhook no re-trackea. Se decide comparando el tier anterior.
  await trackSubscriptionEvent(db, info, prevSub);

  return NextResponse.json({ ok: true });
}

/**
 * Traduce un cambio de suscripción a UN evento de analytics (o ninguno):
 * alta / upgrade / downgrade / cancelación / pago fallido. `prevSub` es el
 * estado antes de aplicar; sin él, un `active` se toma como alta.
 */
async function trackSubscriptionEvent(
  db: ReturnType<typeof createServiceClient>,
  info: SubscriptionInfo,
  prevSub: { tier: string; is_trial: boolean } | null,
): Promise<void> {
  const businessId = info.businessId!;
  const common = await commonPropsFor(db, businessId);
  const cycle = info.cycle ?? 'monthly';
  const prevTier: PlanId = isPlanId(prevSub?.tier) ? (prevSub!.tier as PlanId) : 'free';
  const wasTrialOrFree = !prevSub || prevSub.is_trial || prevTier === 'free';

  if (info.status === 'past_due' || info.status === 'unpaid') {
    await trackServer('payment_failed', businessId, common);
    return;
  }
  if (info.status === 'canceled') {
    await trackServer('subscription_cancelled', businessId, { ...common, plan: prevTier });
    return;
  }
  if (info.status === 'active' && info.tier) {
    const newTier = info.tier;
    if (wasTrialOrFree) {
      await trackServer('subscription_started', businessId, { ...common, plan: newTier, cycle });
    } else if (planRank(newTier) > planRank(prevTier)) {
      await trackServer('subscription_upgraded', businessId, {
        ...common,
        previous_plan: prevTier,
        new_plan: newTier,
      });
    } else if (planRank(newTier) < planRank(prevTier)) {
      await trackServer('subscription_downgraded', businessId, {
        ...common,
        previous_plan: prevTier,
        new_plan: newTier,
      });
    }
    // Mismo tier ⇒ renovación: no es un evento de conversión.
  }
}
