import 'server-only';

/**
 * Punto de entrada de la capa de pagos. La UI y los route handlers de negocio
 * piden un `PaymentProvider` acá — nunca instancian un proveedor concreto ni
 * llaman a su SDK/API directo (CLAUDE.md §3).
 *
 * Hoy Chile ⇒ Mercado Pago. Stripe (global) entra como otra implementación
 * detrás de la misma interfaz cuando toque.
 */

import { MercadoPagoProvider } from './mercadopago/provider';
import { MercadoPagoBilling } from './mercadopago/billing';
import type { PaymentProvider } from './types';
import type { SubscriptionBilling } from './billing.types';

let cachedProvider: MercadoPagoProvider | null = null;
let cachedBilling: MercadoPagoBilling | null = null;

/** Provider de ANTICIPOS vigente. Por ahora siempre Mercado Pago (CLP/Chile). */
export function getPaymentProvider(): PaymentProvider {
  cachedProvider ??= new MercadoPagoProvider();
  return cachedProvider;
}

/**
 * Billing de SUSCRIPCIONES del plan vigente. Por ahora Mercado Pago (CLP/Chile);
 * Stripe (USD, global) entra detrás de la misma interfaz cuando toque.
 */
export function getSubscriptionBilling(): SubscriptionBilling {
  cachedBilling ??= new MercadoPagoBilling();
  return cachedBilling;
}

export type { PaymentProvider } from './types';
export type { SubscriptionBilling } from './billing.types';
