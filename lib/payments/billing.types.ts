/**
 * Interfaz `SubscriptionBilling` — cobro del PLAN DE RESSY al negocio. Análoga a
 * `PaymentProvider` (anticipos), pero acá el dinero va a LA CUENTA DE RESSY (es
 * el ingreso SaaS), no a la del negocio. Mercado Pago (preapproval, CLP/Chile)
 * es la implementación de hoy; Stripe Billing (USD, global) entra como otra impl
 * detrás de la misma interfaz cuando toque (CLAUDE.md §2).
 *
 * NADIE llama al SDK/API de un proveedor directo desde UI o route handlers: todo
 * pasa por acá. Montos de precio salen SIEMPRE de lib/plans/config.ts (`priceFor`).
 */

import type { PlanId, BillingCycle } from '@/lib/plans/config';

export type { BillingCycle };

/** Estado normalizado del plan; coincide con el enum `subscription_status` (subset). */
export type BillingStatus = 'active' | 'incomplete' | 'past_due' | 'canceled' | 'unpaid';

export interface CreateSubscriptionArgs {
  businessId: string;
  /** Plan pago a contratar. `free` no tiene billing. */
  tier: Exclude<PlanId, 'free'>;
  cycle: BillingCycle;
  /** Email del dueño/pagador — MP lo exige para el preapproval. */
  payerEmail: string;
  /** Idioma para la URL de retorno al dashboard. */
  locale: 'es' | 'en';
  /**
   * Ruta (después del locale) a la que MP devuelve tras el checkout. Distingue el
   * origen: dashboard vs onboarding (celebración). Default: la tab de plan.
   */
  returnPath?: string;
}

export interface SubscriptionCheckout {
  /** URL hospedada donde el negocio autoriza el cobro recurrente (init_point). */
  checkoutUrl: string;
  /** Referencia del proveedor (preapproval id de MP). Se guarda para gestionar/cancelar. */
  providerRef: string;
}

export interface SubscriptionInfo {
  /** Id del preapproval en el proveedor. */
  externalId: string;
  /** business_id parseado del external_reference que fijamos al crear. */
  businessId: string | null;
  /** Tier parseado del external_reference. La autoridad de qué plan es la nuestra, no MP. */
  tier: Exclude<PlanId, 'free'> | null;
  cycle: BillingCycle | null;
  status: BillingStatus;
  /** Id del pagador en el proveedor, si lo hay. */
  payerId: string | null;
  /** Próximo cobro / fin del período pagado (ISO UTC), si lo hay. */
  currentPeriodEnd: string | null;
}

/** Resultado de validar un webhook de suscripción. `valid=false` ⇒ 401, no se procesa. */
export interface SubscriptionWebhookVerification {
  valid: boolean;
  /**
   * `preapproval` = alta/cambio de estado de la suscripción; `authorized_payment`
   * = un cobro recurrente concreto. El resto se ignora silenciosamente.
   */
  kind: 'preapproval' | 'authorized_payment' | 'other';
  /** Id del recurso a consultar (preapproval id o authorized_payment id). */
  resourceId: string | null;
  /** Id único del evento para deduplicar reintentos. */
  eventId: string;
}

export interface SubscriptionBilling {
  readonly provider: 'mercadopago' | 'stripe';
  /** ¿El proveedor tiene su config global lista? */
  isConfigured(): boolean;

  /** Crea el preapproval (cobro recurrente) y devuelve la URL para autorizarlo. */
  createSubscription(args: CreateSubscriptionArgs): Promise<SubscriptionCheckout>;

  /** Consulta el estado real de un preapproval. */
  getSubscription(providerRef: string): Promise<SubscriptionInfo>;

  /** Cancela el preapproval en el proveedor (baja el cobro recurrente). */
  cancel(providerRef: string): Promise<void>;

  /** Valida firma y deduce recurso/evento de un webhook (sync, sin red). */
  verifyWebhook(headers: Headers, rawBody: string): SubscriptionWebhookVerification;

  /** Dado el id de un authorized_payment, devuelve su preapproval id (para casar el evento). */
  preapprovalIdForPayment(authorizedPaymentId: string): Promise<string | null>;
}
