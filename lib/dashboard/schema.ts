/**
 * Esquemas Zod de las acciones del calendario (CLAUDE.md §6: Zod en todo límite).
 * Mismos criterios que lib/booking/schema: `z.guid()` para tolerar los UUID del
 * seed, `z.iso.datetime()` para instantes UTC.
 */

import { z } from 'zod';

const uuid = () => z.guid();
const isoDateTime = () => z.iso.datetime();

/** Transiciones que dispara el negocio desde el detalle de la reserva. */
export const businessTransitionSchema = z.object({
  bookingId: uuid(),
  target: z.enum(['completed', 'no_show', 'cancelled_by_business']),
  reason: z.string().trim().max(500).optional(),
});

export const rescheduleSchema = z.object({
  bookingId: uuid(),
  startsAt: isoDateTime(),
  staffMemberId: uuid(),
});

/** Cliente: existente (id) o nuevo (nombre + al menos un contacto). */
export const manualBookingSchema = z
  .object({
    businessId: uuid(),
    serviceId: uuid(),
    staffMemberId: uuid(),
    startsAt: isoDateTime(),
    customerId: uuid().nullable().optional(),
    customerName: z.string().trim().max(120).optional(),
    customerEmail: z.union([z.email(), z.literal('')]).optional(),
    customerPhone: z.union([z.string().trim().min(6).max(30), z.literal('')]).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (d) =>
      Boolean(d.customerId) ||
      (Boolean(d.customerName) && (Boolean(d.customerEmail) || Boolean(d.customerPhone))),
    { message: 'contact_required', path: ['customerName'] },
  );

export const blockTimeSchema = z.object({
  businessId: uuid(),
  /** null = bloquea a todo el negocio. */
  staffMemberId: uuid().nullable(),
  startsAt: isoDateTime(),
  endsAt: isoDateTime(),
  reason: z.string().trim().max(200).optional(),
});

export type BusinessTransitionInput = z.infer<typeof businessTransitionSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type ManualBookingInput = z.infer<typeof manualBookingSchema>;
export type BlockTimeInput = z.infer<typeof blockTimeSchema>;
