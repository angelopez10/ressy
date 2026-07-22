'use server';

/**
 * Acciones del dashboard para la SUSCRIPCIÓN del plan (Mercado Pago preapproval,
 * cuenta de Ressy). Distinto de payments.actions.ts (anticipos, cuenta del
 * negocio). Todo pasa por la capa de billing (`SubscriptionBilling`); la
 * transición de tier/estado la decide el WEBHOOK, no estas acciones.
 */

import { createClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/service';
import { getSubscriptionBilling } from '@/lib/payments';
import { getMpTestPayerEmail } from '@/lib/payments/env';
import type { BillingCycle } from '@/lib/plans/config';
import { getDashboardContext } from './context';

type UpgradeResult = { ok: true; checkoutUrl: string } | { ok: false; error: string };
type CancelResult = { ok: true } | { ok: false; error: string };

const PAID_TIERS = ['solo', 'team', 'studio'] as const;
type PaidTier = (typeof PAID_TIERS)[number];

async function requireAdmin() {
  const ctx = await getDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return null;
  return ctx;
}

/**
 * Inicia la contratación de un plan pago: crea el preapproval en MP y devuelve la
 * URL para autorizar el cobro recurrente. NO cambia el tier — eso lo confirma el
 * webhook cuando MP autoriza el primer pago.
 */
export async function startSubscriptionUpgrade(
  tier: string,
  cycle: string,
  locale: string,
  /** Ruta de retorno tras el checkout (default: tab de plan). El onboarding pasa 'welcome'. */
  returnPath?: string,
): Promise<UpgradeResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };

  if (!PAID_TIERS.includes(tier as PaidTier)) return { ok: false, error: 'invalidTier' };
  if (cycle !== 'monthly' && cycle !== 'yearly') return { ok: false, error: 'invalidCycle' };

  // Billing por MP es CLP-only por ahora (Stripe/USD es sesión futura).
  if (ctx.business.currency.toUpperCase() !== 'CLP') return { ok: false, error: 'currencyUnsupported' };

  const billing = getSubscriptionBilling();
  if (!billing.isConfigured()) return { ok: false, error: 'unconfigured' };

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  // En sandbox, MP exige payer de prueba (ver getMpTestPayerEmail); en prod se usa
  // el email real del dueño logueado.
  const payerEmail = getMpTestPayerEmail() ?? user?.email;
  if (!payerEmail) return { ok: false, error: 'noEmail' };

  let checkout;
  try {
    checkout = await billing.createSubscription({
      businessId: ctx.business.id,
      tier: tier as PaidTier,
      cycle: cycle as BillingCycle,
      payerEmail,
      locale: locale === 'en' ? 'en' : 'es',
      returnPath,
    });
  } catch (e) {
    console.error('subscription upgrade failed', { business_id: ctx.business.id, tier, error: String(e) });
    return { ok: false, error: 'providerError' };
  }

  // Enlaza el preapproval al negocio de una (service role: subscriptions es
  // write deny-all bajo RLS). El tier/estado los sincroniza el webhook.
  const svc = createServiceClient();
  await svc
    .from('subscriptions')
    .update({ billing_provider: 'mercadopago', mp_preapproval_id: checkout.providerRef })
    .eq('business_id', ctx.business.id);

  return { ok: true, checkoutUrl: checkout.checkoutUrl };
}

/**
 * Reconcilia el estado del plan consultando el preapproval REAL en MP y
 * aplicándolo por la misma RPC central que el webhook. NO confía en el redirect:
 * va a la API de MP a buscar el estado autoritativo. Sirve como (a) respaldo si
 * el webhook se pierde —clásico en el sandbox— y (b) auto-sync al volver del
 * checkout. Solo toca el preapproval del PROPIO negocio.
 */
export async function reconcileSubscription(): Promise<
  { ok: true; changed: boolean } | { ok: false; error: string }
> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };

  const svc = createServiceClient();
  const { data: sub } = await svc
    .from('subscriptions')
    .select('mp_preapproval_id')
    .eq('business_id', ctx.business.id)
    .maybeSingle();
  if (!sub?.mp_preapproval_id) return { ok: false, error: 'noSubscription' };

  const billing = getSubscriptionBilling();
  let info;
  try {
    info = await billing.getSubscription(sub.mp_preapproval_id);
  } catch (e) {
    console.error('subscription reconcile failed', { business_id: ctx.business.id, error: String(e) });
    return { ok: false, error: 'providerError' };
  }

  // Defensa de tenant: el preapproval debe ser de ESTE negocio.
  if (info.businessId !== ctx.business.id) return { ok: false, error: 'mismatch' };
  if (info.status === 'active' && !info.tier) return { ok: true, changed: false };

  const { error } = await svc.rpc('subscription_apply_mp_event', {
    p_business_id: info.businessId,
    p_tier: info.tier ?? 'free',
    p_status: info.status,
    p_mp_preapproval_id: info.externalId,
    p_mp_payer_id: info.payerId,
    p_current_period_end: info.currentPeriodEnd,
    p_cancel_at_period_end: info.status === 'canceled',
  });
  if (error) {
    console.error('subscription reconcile apply failed', { business_id: ctx.business.id, message: error.message });
    return { ok: false, error: 'apply' };
  }

  return { ok: true, changed: info.status === 'active' };
}

/**
 * Cancela la suscripción: detiene el cobro recurrente en MP y marca la baja al
 * fin del período pagado. El negocio conserva su plan hasta `current_period_end`;
 * el job `subscription_expire_downgrade` lo baja a Free al vencer.
 */
export async function cancelSubscription(): Promise<CancelResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };

  const svc = createServiceClient();
  const { data: sub } = await svc
    .from('subscriptions')
    .select('mp_preapproval_id')
    .eq('business_id', ctx.business.id)
    .maybeSingle();
  if (!sub?.mp_preapproval_id) return { ok: false, error: 'noSubscription' };

  const billing = getSubscriptionBilling();
  try {
    await billing.cancel(sub.mp_preapproval_id);
  } catch (e) {
    console.error('subscription cancel failed', { business_id: ctx.business.id, error: String(e) });
    return { ok: false, error: 'providerError' };
  }

  // Optimista: el webhook confirmará el estado 'canceled'. La baja a Free la hace
  // el job de expiración cuando venza el período.
  await svc
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('business_id', ctx.business.id);

  return { ok: true };
}
