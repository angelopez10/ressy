import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/service';
import { emitBookingEvent } from '@/lib/inngest/emit';
import { trackBookingCreated } from '@/lib/analytics/booking-events';
import { getPaymentProvider } from '@/lib/payments';

/**
 * Webhook de ANTICIPOS de Mercado Pago (cuenta del negocio). SOLO anticipos:
 * un futuro webhook de suscripciones (Stripe, cuenta de Ressy) sería OTRO route
 * handler separado — no se mezclan (CLAUDE.md §Prompt 10B §4).
 *
 * Garantías:
 *   1. Firma válida (HMAC x-signature) o 401 — nunca procesamos sin verificar.
 *   2. Dedup por event_id (payment_webhook_events) — reintentos de MP no duplican.
 *   3. La transición pending_payment → confirmed pasa por la función central
 *      `booking_confirm_payment`, que además es idempotente por (provider,
 *      external_id). La confirmación al cliente se emite UNA sola vez.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const provider = getPaymentProvider();

  const verdict = provider.verifyWebhook(request.headers, raw);
  if (!verdict.valid) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  // Solo procesamos pagos; el resto se acusa recibo y se ignora.
  if (verdict.kind !== 'payment' || !verdict.resourceId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const businessId = new URL(request.url).searchParams.get('biz');
  if (!businessId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const db = createServiceClient();

  // Dedup del EVENTO: si ya lo procesamos, salimos 200 sin re-hacer nada.
  const { error: dupErr } = await db
    .from('payment_webhook_events')
    .insert({ provider: 'mercadopago', event_id: verdict.eventId || verdict.resourceId });
  if (dupErr) {
    // 23505 = ya procesado. Cualquier otro error ⇒ 500 para que MP reintente.
    if (dupErr.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  // Consulta el pago REAL con el token del negocio (no confiamos en el payload).
  let payment;
  try {
    payment = await provider.getPayment(businessId, verdict.resourceId);
  } catch {
    // Token caído / error transitorio ⇒ 500 para reintento de MP.
    return NextResponse.json({ error: 'lookup' }, { status: 500 });
  }

  const bookingId = payment.bookingRef;
  if (!bookingId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Defensa: la reserva debe ser de ESTE negocio (evita cruces de tenant).
  const { data: booking } = await db
    .from('bookings')
    .select('business_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking || booking.business_id !== businessId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (payment.status === 'approved') {
    const { data: didConfirm } = await db.rpc('booking_confirm_payment', {
      p_booking_id: bookingId,
      p_external_id: payment.externalId,
      p_amount: payment.amount,
      p_currency: payment.currency,
      p_method: payment.method,
      p_payload: null,
    });
    // Solo si ESTA notificación hizo la transición emitimos la confirmación,
    // así el cliente no recibe dos correos por reintentos del webhook.
    if (didConfirm) {
      await emitBookingEvent('booking/created', bookingId);
      // Analytics: la reserva con anticipo recién ahora es REAL. El guard
      // `didConfirm` garantiza que un reintento del webhook no re-trackea.
      await trackBookingCreated(db, bookingId, { withDeposit: true });
    }
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    // Pago fallido ⇒ libera el slot. El cliente ve el fallo en la página de
    // retorno; no le mandamos correo (nada quedó agendado).
    await db.rpc('booking_fail_payment', { p_booking_id: bookingId });
  }
  // pending / in_process: no hacemos nada; llegará otra notificación al aprobar.

  return NextResponse.json({ ok: true });
}
