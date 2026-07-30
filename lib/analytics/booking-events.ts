import 'server-only';

/**
 * ============================================================================
 * Ressy — Helpers de analytics del CICLO DE VIDA DE RESERVAS (server-side)
 * ============================================================================
 * Concentra la lógica no trivial de los eventos de reserva para que los call
 * sites (server actions, webhook) queden en una línea. En especial:
 *
 *   `first_booking_received` — se dispara UNA sola vez por negocio, en su
 *   primera reserva REAL. La idempotencia es transaccional: se cuenta cuántas
 *   reservas reales tiene el negocio DESPUÉS de crearse esta; si el total es 1,
 *   esta es la primera. Como los webhooks solo llaman cuando de verdad hubo
 *   transición (`didConfirm`), un reintento no re-cuenta ni re-emite.
 * ============================================================================
 */

import type { ServiceClient } from '@/lib/db/service';
import type { createClient } from '@/lib/db/server';
import { commonPropsFor, trackServer } from './server';
import type { AnalyticsEventMap } from './events';

type AnyDb = ServiceClient | Awaited<ReturnType<typeof createClient>>;

/** Estados que NO cuentan como reserva real (nunca llegaron a confirmarse). */
const NOT_REAL = '(pending_payment,payment_expired)';

type Origin = AnalyticsEventMap['booking_created']['origin'];

function toOrigin(source: string | null | undefined): Origin {
  switch (source) {
    case 'link':
    case 'qr':
    case 'instagram':
    case 'manual':
      return source;
    default:
      return 'other';
  }
}

/**
 * Trackea `booking_created` y, si corresponde, `first_booking_received`. Se
 * llama cuando la reserva pasa a ser REAL:
 *   - reserva pública sin anticipo → al crearse (ya confirmed)
 *   - reserva manual → al crearse (confirmed)
 *   - reserva con anticipo → en el webhook, SOLO cuando confirmó el pago
 *
 * `withDeposit` lo decide el call site (sabe por qué camino viene); `origin` se
 * infiere del `source` de la reserva si no se pasa.
 */
export async function trackBookingCreated(
  db: AnyDb,
  bookingId: string,
  opts: { withDeposit: boolean; origin?: Origin },
): Promise<void> {
  const { data: booking } = await db
    .from('bookings')
    .select('business_id, source')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return;

  const businessId = booking.business_id;
  const common = await commonPropsFor(db, businessId);
  const origin = opts.origin ?? toOrigin(booking.source);

  await trackServer('booking_created', businessId, {
    ...common,
    origin,
    with_deposit: opts.withDeposit,
  });

  // ¿Es la PRIMERA reserva real del negocio? Cuenta las reales (esta incluida).
  const { count } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .not('status', 'in', NOT_REAL);

  if (count === 1) {
    await trackServer('first_booking_received', businessId, common);
  }
}

/** Estado de una reserva ⇒ quién la canceló, para el `by` del evento. */
async function loadBusinessId(db: AnyDb, bookingId: string): Promise<string | null> {
  const { data } = await db.from('bookings').select('business_id').eq('id', bookingId).maybeSingle();
  return data?.business_id ?? null;
}

export async function trackBookingCancelled(
  db: AnyDb,
  bookingId: string,
  by: 'client' | 'business',
): Promise<void> {
  const businessId = await loadBusinessId(db, bookingId);
  if (!businessId) return;
  const common = await commonPropsFor(db, businessId);
  await trackServer('booking_cancelled', businessId, { ...common, by });
}

export async function trackBookingRescheduled(
  db: AnyDb,
  bookingId: string,
  by: 'client' | 'business',
): Promise<void> {
  const businessId = await loadBusinessId(db, bookingId);
  if (!businessId) return;
  const common = await commonPropsFor(db, businessId);
  await trackServer('booking_rescheduled', businessId, { ...common, by });
}

export async function trackBookingCompleted(db: AnyDb, bookingId: string): Promise<void> {
  const businessId = await loadBusinessId(db, bookingId);
  if (!businessId) return;
  const common = await commonPropsFor(db, businessId);
  await trackServer('booking_completed', businessId, common);
}

export async function trackBookingNoShow(db: AnyDb, bookingId: string): Promise<void> {
  const businessId = await loadBusinessId(db, bookingId);
  if (!businessId) return;
  const common = await commonPropsFor(db, businessId);
  await trackServer('booking_no_show', businessId, common);
}
