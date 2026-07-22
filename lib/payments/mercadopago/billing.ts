import 'server-only';

/**
 * Implementación de `SubscriptionBilling` para Mercado Pago (preapproval, CLP).
 * Cobra el PLAN DE RESSY al negocio EN LA CUENTA DE RESSY (ingreso SaaS), con el
 * token propio de Ressy (`MP_ACCESS_TOKEN`) — NO el OAuth de vendedores de los
 * anticipos. El precio SIEMPRE sale de lib/plans/config.ts (`priceFor`).
 *
 * Autoridad de negocio: qué tier corresponde a un preapproval lo decide RESSY,
 * no MP. Por eso el tier (y el ciclo) viajan en el `external_reference` que
 * fijamos al crear, y el webhook los lee de vuelta — igual criterio que el
 * booking_id en los anticipos.
 */

import { priceFor, type BillingCycle, type PlanId } from '@/lib/plans/config';
import { getAppUrl } from '@/lib/notifications/env';
import { getMpAccessToken } from '../env';
import type {
  BillingStatus,
  CreateSubscriptionArgs,
  SubscriptionBilling,
  SubscriptionCheckout,
  SubscriptionInfo,
  SubscriptionWebhookVerification,
} from '../billing.types';
import {
  cancelPreapproval,
  createPreapproval,
  getAuthorizedPayment,
  getPreapproval,
} from './preapproval';
import { verifyMpSignature } from './signature';
import { getMpWebhookSecret } from '../env';

const CURRENCY = 'CLP';
type PaidTier = Exclude<PlanId, 'free'>;

/** external_reference: `businessId:tier:cycle`. El uuid no lleva ':' — split seguro. */
function encodeRef(businessId: string, tier: PaidTier, cycle: BillingCycle): string {
  return `${businessId}:${tier}:${cycle}`;
}

function decodeRef(ref: string | null): {
  businessId: string | null;
  tier: PaidTier | null;
  cycle: BillingCycle | null;
} {
  if (!ref) return { businessId: null, tier: null, cycle: null };
  const [businessId, tier, cycle] = ref.split(':');
  return {
    businessId: businessId || null,
    tier: tier === 'solo' || tier === 'team' || tier === 'studio' ? tier : null,
    cycle: cycle === 'monthly' || cycle === 'yearly' ? cycle : null,
  };
}

/** Estado de preapproval de MP → enum de estado normalizado (subset del DB). */
function normalizeStatus(mp: string): BillingStatus {
  switch (mp) {
    case 'authorized':
      return 'active';
    case 'paused':
      return 'past_due';
    case 'cancelled':
      return 'canceled';
    case 'pending':
    default:
      return 'incomplete';
  }
}

/** Copy del cobro que ve el pagador en MP. No es UI de la app; descriptor mínimo. */
function reasonFor(tier: PaidTier, cycle: BillingCycle, locale: 'es' | 'en'): string {
  const name = tier.charAt(0).toUpperCase() + tier.slice(1);
  const cycleLabel =
    locale === 'es'
      ? cycle === 'yearly'
        ? 'anual'
        : 'mensual'
      : cycle === 'yearly'
        ? 'yearly'
        : 'monthly';
  return locale === 'es'
    ? `Ressy · Plan ${name} (${cycleLabel})`
    : `Ressy · ${name} plan (${cycleLabel})`;
}

export class MercadoPagoBilling implements SubscriptionBilling {
  readonly provider = 'mercadopago' as const;

  isConfigured(): boolean {
    return getMpAccessToken() !== null;
  }

  private token(): string {
    const token = getMpAccessToken();
    if (!token) throw new Error('Mercado Pago billing no está configurado (MP_ACCESS_TOKEN).');
    return token;
  }

  async createSubscription(args: CreateSubscriptionArgs): Promise<SubscriptionCheckout> {
    const amount = priceFor(args.tier, 'clp', args.cycle);
    const res = await createPreapproval(this.token(), {
      reason: reasonFor(args.tier, args.cycle, args.locale),
      externalReference: encodeRef(args.businessId, args.tier, args.cycle),
      payerEmail: args.payerEmail,
      backUrl: `${getAppUrl()}/${args.locale}/${args.returnPath ?? 'dashboard/upgrade?billing=return'}`,
      notificationUrl: `${getAppUrl()}/api/payments/mp/subscription`,
      amount,
      currency: CURRENCY,
      frequencyMonths: args.cycle === 'yearly' ? 12 : 1,
    });
    return { checkoutUrl: res.init_point, providerRef: res.id };
  }

  async getSubscription(providerRef: string): Promise<SubscriptionInfo> {
    const p = await getPreapproval(this.token(), providerRef);
    const { businessId, tier, cycle } = decodeRef(p.external_reference);
    return {
      externalId: p.id,
      businessId,
      tier,
      cycle,
      status: normalizeStatus(p.status),
      payerId: p.payer_id != null ? String(p.payer_id) : null,
      currentPeriodEnd: p.next_payment_date,
    };
  }

  async cancel(providerRef: string): Promise<void> {
    await cancelPreapproval(this.token(), providerRef);
  }

  async preapprovalIdForPayment(authorizedPaymentId: string): Promise<string | null> {
    const ap = await getAuthorizedPayment(this.token(), authorizedPaymentId);
    return ap.preapproval_id;
  }

  verifyWebhook(headers: Headers, rawBody: string): SubscriptionWebhookVerification {
    const fail: SubscriptionWebhookVerification = {
      valid: false,
      kind: 'other',
      resourceId: null,
      eventId: '',
    };

    let body: { type?: string; action?: string; data?: { id?: string | number }; id?: string | number };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return fail;
    }

    const type = body.type ?? body.action ?? 'other';
    const kind: SubscriptionWebhookVerification['kind'] =
      type === 'subscription_preapproval'
        ? 'preapproval'
        : type === 'subscription_authorized_payment'
          ? 'authorized_payment'
          : 'other';

    const resourceId = body.data?.id != null ? String(body.data.id) : null;
    const eventId = body.id != null ? String(body.id) : resourceId ? `${type}:${resourceId}` : '';

    if (!resourceId || !verifyMpSignature(headers, resourceId, getMpWebhookSecret())) return fail;

    return { valid: true, kind, resourceId, eventId };
  }
}
