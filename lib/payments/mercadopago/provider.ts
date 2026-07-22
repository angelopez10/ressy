import 'server-only';

/**
 * Implementación de `PaymentProvider` para Mercado Pago (Chile/CLP). Cobra y
 * reembolsa EN LA CUENTA DEL NEGOCIO usando su token OAuth. Ressy nunca recibe
 * ni retiene dinero: no se envía `marketplace_fee`.
 */

import { createServiceClient } from '@/lib/db/service';
import { getMpConfig, getMpWebhookSecret, getMpRedirectUri, isMpSandbox } from '../env';
import { getAppUrl } from '@/lib/notifications/env';
import type {
  CreateDepositArgs,
  DepositCheckout,
  PaymentInfo,
  PaymentProvider,
  RefundResult,
  WebhookVerification,
} from '../types';
import { getValidAccessToken, withBusinessToken } from './account';
import { createPreference, getPayment, refundPayment, normalizeStatus } from './api';
import { verifyMpSignature } from './signature';

/**
 * URL de webhook con el `biz` del negocio: el webhook no sabe a priori de qué
 * cuenta viene la notificación, y para consultar el pago necesita el token de
 * ESE negocio. El `biz` no afecta la firma (que solo cubre id/request-id/ts).
 */
function notificationUrl(businessId: string): string {
  return `${getAppUrl()}/api/payments/mp/webhook?biz=${businessId}`;
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly id = 'mercadopago' as const;

  isConfigured(): boolean {
    return getMpConfig() !== null && getMpRedirectUri().length > 0;
  }

  async createDepositCheckout(args: CreateDepositArgs): Promise<DepositCheckout> {
    return withBusinessToken(args.businessId, async (token, db) => {
      const pref = await createPreference(token, {
        amount: args.amount,
        currency: args.currency,
        description: args.description,
        bookingId: args.bookingId,
        notificationUrl: notificationUrl(args.businessId),
        successUrl: `${getAppUrl()}/${args.locale}/${args.businessSlug}?payment=success&booking=${args.bookingId}`,
        failureUrl: `${getAppUrl()}/${args.locale}/${args.businessSlug}?payment=failure&booking=${args.bookingId}`,
        pendingUrl: `${getAppUrl()}/${args.locale}/${args.businessSlug}?payment=pending&booking=${args.bookingId}`,
      });

      // En dev con usuarios de prueba (MP_SANDBOX=true) hay que pagar en
      // sandbox.mercadopago.cl; en producción, en www.mercadopago.cl. No sirve
      // `live_mode` para decidir (los test users lo reportan true). `db` no se
      // usa acá, pero withBusinessToken lo provee.
      void db;
      const checkoutUrl = isMpSandbox() ? pref.sandbox_init_point : pref.init_point;

      return { checkoutUrl, providerRef: pref.id };
    });
  }

  async getPayment(businessId: string, externalId: string): Promise<PaymentInfo> {
    const db = createServiceClient();
    const token = await getValidAccessToken(db, businessId);
    const p = await getPayment(token, externalId);
    return {
      externalId: String(p.id),
      bookingRef: p.external_reference,
      status: normalizeStatus(p.status),
      amount: Math.round(p.transaction_amount),
      currency: p.currency_id,
      method: p.payment_method_id,
      receiptUrl: null, // MP no expone un comprobante público estable por API.
    };
  }

  async refund(businessId: string, externalId: string, amount?: number): Promise<RefundResult> {
    const db = createServiceClient();
    const token = await getValidAccessToken(db, businessId);
    const r = await refundPayment(token, externalId, amount);
    return { status: normalizeStatus(r.status === 'approved' ? 'refunded' : r.status), refundId: String(r.id) };
  }

  /**
   * Valida la firma `x-signature` de MP (HMAC-SHA256 sobre un template con el
   * id del recurso, el request-id y el timestamp). Sin secret configurado ⇒
   * no se puede validar ⇒ inválido (nunca procesamos un webhook sin verificar).
   */
  verifyWebhook(headers: Headers, rawBody: string): WebhookVerification {
    const secret = getMpWebhookSecret();
    const fail: WebhookVerification = { valid: false, kind: 'other', resourceId: null, eventId: '' };
    if (!secret) return fail;

    let body: { type?: string; data?: { id?: string | number }; id?: string | number; action?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return fail;
    }

    const type = body.type ?? (body.action?.split('.')[0] ?? 'other');
    const resourceId = body.data?.id != null ? String(body.data.id) : null;
    const eventId = body.id != null ? String(body.id) : resourceId ? `${type}:${resourceId}` : '';

    if (!resourceId || !verifyMpSignature(headers, resourceId, secret)) return fail;

    return {
      valid: true,
      kind: type === 'payment' ? 'payment' : 'other',
      resourceId,
      eventId,
    };
  }
}
