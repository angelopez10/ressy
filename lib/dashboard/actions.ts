'use server';

/**
 * Server actions del calendario del dashboard. Toda escritura pasa por las
 * funciones SECURITY DEFINER de la migración 09 (transición central de estado,
 * reserva manual, reagende, bloqueo), nunca por un UPDATE suelto — CLAUDE.md §3.
 *
 * El cliente refresca la vista con `router.refresh()` tras un resultado ok, así
 * que estas acciones no revalidan rutas a mano: re-corren el server component y
 * la data del rango se vuelve a leer con RLS.
 */

import { createClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/service';
import { emitBookingEvent } from '@/lib/inngest/emit';
import {
  trackBookingCreated,
  trackBookingCancelled,
  trackBookingCompleted,
  trackBookingNoShow,
  trackBookingRescheduled,
} from '@/lib/analytics/booking-events';
import { trackServer } from '@/lib/analytics/server';
import type { BookingFailure } from '@/lib/booking/types';
import {
  blockTimeSchema,
  businessTransitionSchema,
  manualBookingSchema,
  rescheduleSchema,
} from './schema';
import type { AgendaActionResult, CreateManualBookingResult, CustomerHistoryDTO } from './types';
import { getCustomerHistory } from './queries';
import { resolveTenant } from './tenant';

type Reason = BookingFailure | 'not_authorized' | 'invalid_range';

/** Traduce el `raise exception '<razón>'` de Postgres a una razón de dominio. */
function mapError(message: string | undefined): Reason {
  switch (message) {
    case 'slot_taken':
      return 'slot_taken';
    case 'slot_unavailable':
      return 'slot_unavailable';
    case 'contact_required':
      return 'contact_required';
    case 'not_authorized':
      return 'not_authorized';
    case 'invalid_range':
      return 'invalid_range';
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

/** Marca completada / no-show / cancelada por el negocio. */
export async function applyBusinessTransition(raw: unknown): Promise<AgendaActionResult> {
  const input = businessTransitionSchema.parse(raw);
  const db = await createClient();
  const { error } = await db.rpc('booking_apply_business_transition', {
    p_booking_id: input.bookingId,
    p_target: input.target,
    p_reason: input.reason ?? null,
  });
  if (error) return { ok: false, reason: mapError(error.message) };
  // El negocio canceló ⇒ cancela recordatorios + avisa. Completada ⇒ hook post-servicio.
  const svc = createServiceClient();
  if (input.target === 'cancelled_by_business') {
    await emitBookingEvent('booking/cancelled', input.bookingId);
    await trackBookingCancelled(svc, input.bookingId, 'business');
  } else if (input.target === 'completed') {
    await emitBookingEvent('booking/completed', input.bookingId);
    await trackBookingCompleted(svc, input.bookingId);
  } else if (input.target === 'no_show') {
    await trackBookingNoShow(svc, input.bookingId);
  }
  return { ok: true };
}

/** Reagenda una reserva a nueva hora/staff, respetando el anti-solape. */
export async function rescheduleAsBusiness(raw: unknown): Promise<AgendaActionResult> {
  const input = rescheduleSchema.parse(raw);
  const db = await createClient();
  const { error } = await db.rpc('reschedule_business_booking', {
    p_booking_id: input.bookingId,
    p_new_starts_at: input.startsAt,
    p_new_staff_member_id: input.staffMemberId,
  });
  if (error) return { ok: false, reason: mapError(error.message) };
  await emitBookingEvent('booking/rescheduled', input.bookingId);
  await trackBookingRescheduled(createServiceClient(), input.bookingId, 'business');
  return { ok: true };
}

/** Crea una reserva manual (walk-in / teléfono) en estado confirmed. */
export async function createManualBooking(raw: unknown): Promise<CreateManualBookingResult> {
  const input = manualBookingSchema.parse(raw);
  const db = await createClient();
  const { data, error } = await db.rpc('create_manual_booking', {
    p_business_id: input.businessId,
    p_service_id: input.serviceId,
    p_staff_member_id: input.staffMemberId,
    p_starts_at: input.startsAt,
    p_customer_id: input.customerId ?? null,
    p_customer_name: input.customerName || null,
    p_customer_email: input.customerEmail || null,
    p_customer_phone: input.customerPhone || null,
    p_note: input.note || null,
  });
  if (error || !data || !data[0]) {
    const reason = mapError(error?.message);
    if (reason === 'at_capacity') {
      await trackServer('plan_limit_reached', input.businessId, { limit: 'bookings' });
    }
    return { ok: false, reason };
  }
  // Reserva manual confirmada ⇒ confirmación al cliente + recordatorios.
  await emitBookingEvent('booking/created', data[0].booking_id);
  await trackBookingCreated(createServiceClient(), data[0].booking_id, {
    withDeposit: false,
    origin: 'manual',
  });
  return { ok: true, bookingId: data[0].booking_id };
}

/** Bloquea un tramo (schedule_override 'unavailable'). */
export async function blockTime(raw: unknown): Promise<AgendaActionResult> {
  const input = blockTimeSchema.parse(raw);
  const db = await createClient();
  const { error } = await db.rpc('create_schedule_override', {
    p_business_id: input.businessId,
    p_staff_member_id: input.staffMemberId,
    p_kind: 'unavailable',
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_reason: input.reason ?? null,
  });
  if (error) return { ok: false, reason: mapError(error.message) };
  return { ok: true };
}

/**
 * Mini-historial del cliente para el panel de detalle.
 *
 * El negocio se resuelve en el servidor: es una server action, o sea un
 * endpoint POST direccionable, así que el `customerId` que llega del cliente se
 * acota contra el tenant de la sesión y nunca al revés (CLAUDE.md §3).
 */
export async function fetchCustomerHistory(
  customerId: string,
  currency: string,
): Promise<CustomerHistoryDTO> {
  const tenant = await resolveTenant();
  if (!tenant) return { visits: 0, noShows: 0, totalSpent: 0, currency };
  return getCustomerHistory(customerId, currency, tenant.businessId);
}
