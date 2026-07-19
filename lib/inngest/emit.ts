import 'server-only';

import { inngest } from './client';

type BookingEventName =
  | 'booking/created'
  | 'booking/rescheduled'
  | 'booking/cancelled'
  | 'booking/completed';

/**
 * Emite un evento de reserva a Inngest. NUNCA rompe el flujo de la reserva: si
 * Inngest está caído o sin configurar, se loguea y se sigue (la reserva es lo
 * primario; la notificación es best-effort en el borde de la escritura).
 */
export async function emitBookingEvent(name: BookingEventName, bookingId: string): Promise<void> {
  try {
    await inngest.send({ name, data: { bookingId } });
  } catch (err) {
    console.error('[inngest] no se pudo emitir', name, bookingId, err);
  }
}
