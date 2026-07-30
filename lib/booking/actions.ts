'use server';

/**
 * Server actions de la booking page pública. Toda lectura/escritura a la DB vive
 * aquí (CLAUDE.md §6: nada de fetch a la DB desde el cliente).
 *
 * Escrituras (crear/cancelar/reagendar) NO tocan las tablas directo: pasan por
 * las funciones SECURITY DEFINER de la migración 07, que validan y fuerzan el
 * estado. anon no tiene INSERT sobre bookings.
 */

import { createClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/service';
import { emitBookingEvent } from '@/lib/inngest/emit';
import {
  trackBookingCreated,
  trackBookingCancelled,
  trackBookingRescheduled,
} from '@/lib/analytics/booking-events';
import { trackServer } from '@/lib/analytics/server';
import { getPaymentProvider } from '@/lib/payments';
import { computeAvailability } from '@/lib/availability/engine';
import { PublicAvailabilityDataSource } from '@/lib/availability/source.public';
import type { AvailabilityQuery } from '@/lib/availability/types';
import {
  cancelBookingInputSchema,
  createBookingInputSchema,
  rescheduleBookingInputSchema,
  slotsInputSchema,
} from './schema';
import type {
  BookingFailure,
  CreateBookingResult,
  MutateBookingResult,
  PublicBookingView,
  SlotDTO,
} from './types';

/**
 * Traduce el error de una función de Postgres a una razón de dominio. Las RPCs
 * lanzan `raise exception '<razón>'`, que PostgREST devuelve en `error.message`.
 */
function mapPgError(message: string | undefined): BookingFailure {
  switch (message) {
    case 'slot_taken':
      return 'slot_taken';
    case 'slot_unavailable':
      return 'slot_unavailable';
    case 'contact_required':
      return 'contact_required';
    case 'outside_window':
      return 'outside_window';
    case 'not_found':
      return 'not_found';
    case 'invalid_transition':
      return 'invalid_transition';
    case 'booking_limit_reached':
      return 'at_capacity';
    default:
      return 'error';
  }
}

/**
 * `reason: 'error'` es, por definición, algo que NO modelamos. Sin este log la
 * causa real (código de Postgres, detail, hint) se pierde y en prod solo queda
 * un `{ok:false,reason:'error'}` inaccionable — justo lo que CLAUDE.md §6
 * prohíbe. Se loguea el contexto de negocio (business_id, booking_id) y NUNCA
 * PII del cliente final: nada de email/teléfono/nombre (§9).
 */
function logUnexpectedPgError(
  op: string,
  error: { message?: string; code?: string; details?: string; hint?: string } | null | undefined,
  context: Record<string, string | null | undefined>,
) {
  console.error(`[booking:${op}] error inesperado de Postgres`, {
    ...context,
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
}

// ---------------------------------------------------------------------------
// Disponibilidad
// ---------------------------------------------------------------------------

/**
 * Calcula los slots de un rango (típicamente una semana) para la booking page.
 * Corre el motor con la fuente pública (lee ocupación de `public_busy_slots`).
 */
export async function fetchSlots(raw: unknown): Promise<SlotDTO[]> {
  const input = slotsInputSchema.parse(raw);
  const db = await createClient();
  const source = new PublicAvailabilityDataSource(db);

  const query: AvailabilityQuery = {
    businessId: input.businessId,
    serviceId: input.serviceId,
    staffMemberId: input.staffMemberId ?? undefined,
    from: new Date(input.fromIso),
    to: new Date(input.toIso),
  };

  const data = await source.load(query);
  const slots = computeAvailability({ ...data, externalBusy: [] }, query);

  return slots.map((s) => ({
    startsAtIso: s.startsAt.toISOString(),
    endsAtIso: s.endsAt.toISOString(),
    timezone: s.timezone,
    staffMemberId: s.staffMemberId,
    availableStaffIds: s.availableStaffIds,
  }));
}

// ---------------------------------------------------------------------------
// Crear reserva (guest checkout)
// ---------------------------------------------------------------------------

/**
 * Crea la reserva. Maneja la carrera de doble-booking como caso de primera
 * clase: si el slot se ocupó entremedio, devuelve `slot_taken` y la UI reofrece
 * horarios. En modo "cualquier profesional", si el elegido perdió la carrera,
 * reintenta con el siguiente disponible antes de rendirse.
 */
export async function createBooking(raw: unknown): Promise<CreateBookingResult> {
  const input = createBookingInputSchema.parse(raw);
  const db = await createClient();
  const startsAt = new Date(input.startsAt);

  // Orden de candidatos. Con staff fijo, uno solo. Con "cualquiera", los que el
  // motor reporte libres en ese slot, en su orden (menor sortOrder primero).
  let candidates: string[];
  if (input.staffMemberId) {
    candidates = [input.staffMemberId];
  } else {
    candidates = await resolveAnyStaff(db, input.businessId, input.serviceId, startsAt);
    if (candidates.length === 0) return { ok: false, reason: 'slot_unavailable' };
  }

  let lastFailure: BookingFailure = 'slot_taken';
  for (const staffMemberId of candidates) {
    const { data, error } = await db.rpc('create_public_booking', {
      p_business_id: input.businessId,
      p_service_id: input.serviceId,
      p_staff_member_id: staffMemberId,
      p_starts_at: input.startsAt,
      p_customer_name: input.guest.fullName,
      p_customer_email: input.guest.email || null,
      p_customer_phone: input.guest.phone || null,
      p_customer_locale: input.locale,
      p_note: input.guest.note || null,
      p_source: input.source,
    });

    if (!error && data && data[0]) {
      const row = data[0];

      // Anticipo: la reserva quedó en pending_payment. NO confirmamos ni
      // notificamos todavía — eso lo hace el webhook al aprobarse el pago. Aquí
      // solo creamos el checkout en la cuenta MP del negocio y devolvemos la URL.
      if (row.status === 'pending_payment') {
        const checkoutUrl = await startDepositCheckout(
          input.businessId,
          input.serviceId,
          row.booking_id,
          input.locale,
        );
        if (!checkoutUrl) {
          // No se pudo crear el cobro: liberamos el slot ya (no esperamos el TTL)
          // y pedimos reintentar.
          await createServiceClient().rpc('booking_fail_payment', { p_booking_id: row.booking_id });
          return { ok: false, reason: 'error' };
        }
        return { ok: true, token: row.management_token, status: row.status, checkoutUrl };
      }

      // Sin anticipo: dispara confirmación + recordatorios + aviso al negocio.
      await emitBookingEvent('booking/created', row.booking_id);
      // Analytics: la reserva ya es REAL (confirmed). Con anticipo esto lo hace
      // el webhook al aprobarse el pago (no acá, que quedó en pending_payment).
      await trackBookingCreated(createServiceClient(), row.booking_id, { withDeposit: false });
      return { ok: true, token: row.management_token, status: row.status };
    }

    lastFailure = mapPgError(error?.message);
    if (lastFailure === 'error') {
      logUnexpectedPgError('create', error, {
        businessId: input.businessId,
        serviceId: input.serviceId,
        staffMemberId,
        startsAt: input.startsAt,
      });
    }
    // Solo tiene sentido reintentar con otro staff si ESTE perdió la carrera.
    if (lastFailure !== 'slot_taken') break;
  }

  // Tope de reservas del Free alcanzado ⇒ palanca de conversión.
  if (lastFailure === 'at_capacity') {
    await trackServer('plan_limit_reached', input.businessId, { limit: 'bookings' });
  }
  return { ok: false, reason: lastFailure };
}

/**
 * Crea el checkout del anticipo EN LA CUENTA DEL NEGOCIO y devuelve la URL, o
 * `null` si algo falla (token de MP caído, monto 0, etc.). Todo el contexto se
 * lee con service role: `service_deposit` es SECURITY DEFINER y el provider
 * necesita el token cifrado del negocio.
 */
async function startDepositCheckout(
  businessId: string,
  serviceId: string,
  bookingId: string,
  locale: 'es' | 'en',
): Promise<string | null> {
  const svc = createServiceClient();
  try {
    const [{ data: amount }, { data: biz }, { data: service }] = await Promise.all([
      svc.rpc('service_deposit', { p_business_id: businessId, p_service_id: serviceId }),
      svc.from('businesses').select('slug, currency').eq('id', businessId).single(),
      svc.from('services').select('name').eq('id', serviceId).single(),
    ]);
    if (!amount || amount <= 0 || !biz || !service) {
      // Precondición faltante: sin esto el fallo es indistinguible de un token
      // de MP caído. Solo ids y montos, nada de PII.
      console.error('[booking:deposit] faltan datos para crear el cobro', {
        businessId,
        bookingId,
        amount,
        hasBusiness: Boolean(biz),
        hasService: Boolean(service),
      });
      return null;
    }

    const checkout = await getPaymentProvider().createDepositCheckout({
      businessId,
      bookingId,
      amount,
      currency: biz.currency,
      description: `${locale === 'en' ? 'Deposit' : 'Anticipo'} · ${service.name}`,
      locale,
      businessSlug: biz.slug,
    });
    return checkout.checkoutUrl;
  } catch (err) {
    // El caller libera el slot y pide reintentar, pero el motivo (token de MP
    // vencido, clave de cifrado ausente, API caída) tiene que quedar registrado.
    console.error('[booking:deposit] no se pudo crear el checkout', {
      businessId,
      bookingId,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Resuelve "cualquier profesional" a la lista ordenada de staff libres en el
 * slot exacto. Recomputa disponibilidad en una ventana estrecha alrededor del
 * instante; el slot que el cliente eligió salió de este mismo motor, así que se
 * reproduce.
 */
async function resolveAnyStaff(
  db: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  serviceId: string,
  startsAt: Date,
): Promise<string[]> {
  const HALF_DAY = 12 * 60 * 60 * 1000;
  const query: AvailabilityQuery = {
    businessId,
    serviceId,
    from: new Date(startsAt.getTime() - HALF_DAY),
    to: new Date(startsAt.getTime() + HALF_DAY),
  };
  const source = new PublicAvailabilityDataSource(db);
  const data = await source.load(query);
  const slots = computeAvailability({ ...data, externalBusy: [] }, query);

  const match = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
  return match ? match.availableStaffIds : [];
}

// ---------------------------------------------------------------------------
// Gestión sin login (por token)
// ---------------------------------------------------------------------------

/** Lee una reserva por su token de gestión para la pantalla de reagende/cancelación. */
export async function fetchBooking(token: string): Promise<PublicBookingView | null> {
  const db = await createClient();
  const { data, error } = await db.rpc('get_public_booking', { p_token: token });
  if (error || !data || !data[0]) return null;
  const b = data[0];
  return {
    status: b.status,
    startsAtIso: b.starts_at,
    endsAtIso: b.ends_at,
    businessId: b.business_id,
    serviceId: b.service_id,
    serviceName: b.service_name,
    serviceDurationMin: b.service_duration_min,
    staffMemberId: b.staff_member_id,
    staffName: b.staff_name,
    businessName: b.business_name,
    businessSlug: b.business_slug,
    timezone: b.timezone,
    currency: b.currency,
    priceAmount: b.price_amount,
    cancellationWindowHours: b.cancellation_window_hours,
    customerName: b.customer_name,
  };
}

export async function cancelBooking(raw: unknown): Promise<MutateBookingResult> {
  const input = cancelBookingInputSchema.parse(raw);
  const db = await createClient();
  const { data, error } = await db.rpc('cancel_public_booking', {
    p_token: input.token,
    p_reason: input.reason ?? '',
  });
  if (error) {
    const reason = mapPgError(error.message);
    if (reason === 'error') logUnexpectedPgError('cancel', error, {});
    return { ok: false, reason };
  }
  // Cancela recordatorios pendientes + avisa (best-effort).
  const { data: bookingId } = await db.rpc('booking_id_for_token', { p_token: input.token });
  if (bookingId) {
    await emitBookingEvent('booking/cancelled', bookingId);
    await trackBookingCancelled(createServiceClient(), bookingId, 'client');
  }
  return { ok: true, status: data };
}

export async function rescheduleBooking(raw: unknown): Promise<MutateBookingResult> {
  const input = rescheduleBookingInputSchema.parse(raw);
  const db = await createClient();
  const { data, error } = await db.rpc('reschedule_public_booking', {
    p_token: input.token,
    p_new_starts_at: input.startsAt,
    p_new_staff_member_id: input.staffMemberId,
  });
  if (error) {
    const reason = mapPgError(error.message);
    if (reason === 'error') {
      logUnexpectedPgError('reschedule', error, {
        staffMemberId: input.staffMemberId,
        startsAt: input.startsAt,
      });
    }
    return { ok: false, reason };
  }
  const { data: bookingId } = await db.rpc('booking_id_for_token', { p_token: input.token });
  if (bookingId) {
    await emitBookingEvent('booking/rescheduled', bookingId);
    await trackBookingRescheduled(createServiceClient(), bookingId, 'client');
  }
  return { ok: true, status: data };
}
