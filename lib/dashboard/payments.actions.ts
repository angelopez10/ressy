'use server';

/**
 * Acciones del dashboard para los anticipos (Mercado Pago, sesión 10B). Todo
 * pasa por la capa de pagos (`PaymentProvider`) y el service client (los tokens
 * viven en una tabla RLS deny-all). Nunca se exponen tokens al cliente.
 */

import { createServiceClient } from '@/lib/db/service';
import { getPaymentProvider } from '@/lib/payments';
import { getConnectionInfo, disconnect, type MpConnectionInfo } from '@/lib/payments/mercadopago/account';
import { getDashboardContext, getWritableDashboardContext } from './context';

export type PaymentsActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  // Escritura ⇒ contexto escribible: bloquea la impersonación de soporte.
  const ctx = await getWritableDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return null;
  return ctx;
}

export interface BookingPaymentDTO {
  amount: number;
  currency: string;
  status: string;
  method: string | null;
}

/** Anticipo de una reserva (para el detalle en el calendario). null si no hay. */
export async function getBookingPayment(bookingId: string): Promise<BookingPaymentDTO | null> {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  const db = createServiceClient();
  const { data } = await db
    .from('booking_payments')
    .select('amount, currency, status, method')
    .eq('business_id', ctx.business.id)
    .eq('booking_id', bookingId)
    .eq('provider', 'mercadopago')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { amount: data.amount, currency: data.currency, status: data.status, method: data.method };
}

/** Estado de conexión MP (sin secretos) para el tab de Pagos. */
export async function getMpConnection(): Promise<MpConnectionInfo> {
  const ctx = await getDashboardContext();
  if (!ctx) return { status: 'disconnected', mpUserId: null, connectedAt: null, expiresAt: null };
  return getConnectionInfo(createServiceClient(), ctx.business.id);
}

/** Desconecta la cuenta MP: borra los tokens. Habrá que reconectar para cobrar. */
export async function disconnectMp(): Promise<PaymentsActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  await disconnect(createServiceClient(), ctx.business.id);
  return { ok: true };
}

/**
 * Reembolsa el anticipo de una reserva sobre la cuenta MP DEL NEGOCIO. La
 * política de reembolso es del negocio; Ressy solo ejecuta la orden sobre su
 * cuenta (no es parte de la transacción). Registra el estado en booking_payments.
 */
export async function refundDeposit(bookingId: string): Promise<PaymentsActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };

  const db = createServiceClient();
  const { data: payment } = await db
    .from('booking_payments')
    .select('external_id, status')
    .eq('business_id', ctx.business.id)
    .eq('booking_id', bookingId)
    .eq('provider', 'mercadopago')
    .eq('status', 'paid')
    .maybeSingle();

  if (!payment?.external_id) return { ok: false, error: 'noPayment' };

  try {
    await getPaymentProvider().refund(ctx.business.id, payment.external_id);
  } catch {
    return { ok: false, error: 'refundFailed' };
  }

  await db.rpc('record_payment_refund', {
    p_business_id: ctx.business.id,
    p_external_id: payment.external_id,
    p_status: 'refunded',
  });
  return { ok: true };
}
