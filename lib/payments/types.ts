/**
 * Interfaz `PaymentProvider` (CLAUDE.md §3): Stripe y Mercado Pago son
 * implementaciones intercambiables. NADIE llama al SDK/API de un proveedor
 * directo desde UI o route handlers de negocio — todo pasa por acá.
 *
 * Alcance de esta sesión (10B): ANTICIPOS en Chile/CLP con Mercado Pago,
 * cobrados EN LA CUENTA DEL NEGOCIO vía OAuth. Ressy nunca toca el dinero.
 *
 * Montos SIEMPRE en unidad menor (integer). En CLP no hay decimales, así que
 * el integer coincide con el monto en pesos.
 */

export type ProviderId = 'mercadopago' | 'stripe';

/** Estado normalizado de un pago (mapea el vocabulario de cada proveedor). */
export type NormalizedPaymentStatus =
  | 'pending'
  | 'in_process'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

export interface DepositCheckout {
  /** URL del checkout hospedado del proveedor (init_point de MP). */
  checkoutUrl: string;
  /** Referencia del proveedor (preference id de MP). Se guarda para auditoría. */
  providerRef: string;
}

export interface PaymentInfo {
  /** Id del pago en el proveedor (payment id de MP). */
  externalId: string;
  /** external_reference que pusimos al crear el cobro = booking_id. */
  bookingRef: string | null;
  status: NormalizedPaymentStatus;
  /** Unidad menor (CLP: pesos, sin decimales). */
  amount: number;
  currency: string;
  /** Medio de pago legible (ej. 'debit_card', 'account_money'), si lo hay. */
  method: string | null;
  /** URL del comprobante del proveedor, si aplica. */
  receiptUrl: string | null;
}

export interface RefundResult {
  status: NormalizedPaymentStatus;
  /** Id del reembolso en el proveedor, si lo devuelve. */
  refundId: string | null;
}

/** Resultado de validar un webhook entrante. `valid=false` ⇒ 401, no se procesa. */
export interface WebhookVerification {
  valid: boolean;
  /** 'payment' es lo único que procesamos hoy; el resto se ignora silenciosamente. */
  kind: 'payment' | 'other';
  /** Id del recurso (payment id de MP) a consultar con el token del vendedor. */
  resourceId: string | null;
  /** Id único del evento para deduplicar reintentos. */
  eventId: string;
}

export interface CreateDepositArgs {
  businessId: string;
  bookingId: string;
  /** Unidad menor. */
  amount: number;
  currency: string;
  /** Título que ve el cliente en el checkout (ej. "Anticipo · Corte de pelo"). */
  description: string;
  /** Idioma del cliente para las URLs de retorno. */
  locale: 'es' | 'en';
  /** Slug del negocio para las URLs de retorno a la booking page. */
  businessSlug: string;
}

export interface PaymentProvider {
  readonly id: ProviderId;
  /** ¿El proveedor tiene su config global lista? (credenciales de la app). */
  isConfigured(): boolean;

  /**
   * Crea el cobro del anticipo EN LA CUENTA DEL NEGOCIO (con su token OAuth).
   * `booking_id` viaja como referencia externa para casar el webhook.
   */
  createDepositCheckout(args: CreateDepositArgs): Promise<DepositCheckout>;

  /** Consulta el estado real de un pago (con el token del negocio). */
  getPayment(businessId: string, externalId: string): Promise<PaymentInfo>;

  /** Reembolsa (total o parcial) sobre la cuenta del negocio. */
  refund(businessId: string, externalId: string, amount?: number): Promise<RefundResult>;

  /** Valida firma y deduce el recurso/evento de un webhook (sync, sin red). */
  verifyWebhook(headers: Headers, rawBody: string): WebhookVerification;
}
