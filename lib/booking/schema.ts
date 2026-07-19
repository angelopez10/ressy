/**
 * Esquemas Zod del flujo de reserva (CLAUDE.md §6: Zod en todo límite).
 * Los tipos de los server actions se derivan de aquí, no se declaran a mano.
 *
 * Se usan los validadores de primer nivel de Zod v4 (`z.uuid`, `z.email`,
 * `z.iso.datetime`) en vez de los métodos `.uuid()/.email()` sobre string, que
 * están deprecados en v4.
 */

import { z } from 'zod';

export const localeSchema = z.enum(['es', 'en']);

export const bookingSourceSchema = z.enum(['link', 'qr', 'instagram', 'manual', 'other']);

// `z.guid` valida la forma 8-4-4-4-12 sin exigir los bits de versión/variante de
// RFC 4122. Necesario porque los UUID fijos del seed ('1111…', '2222…') no son
// conformes a RFC, y `z.uuid()` (estricto en v4) los rechazaría. Los UUID reales
// de gen_random_uuid() pasan ambos, así que guid es el común denominador seguro.
const uuid = () => z.guid();
const isoDateTime = () => z.iso.datetime();

/**
 * Normaliza el `?src=` de la URL al enum de la DB. Cualquier cosa no reconocida
 * cae a 'link' (el default de la columna): un query param sucio no debe romper
 * la reserva.
 */
export function parseBookingSource(
  raw: string | undefined | null,
): z.infer<typeof bookingSourceSchema> {
  const parsed = bookingSourceSchema.safeParse(raw);
  return parsed.success ? parsed.data : 'link';
}

/** Datos del cliente en el guest checkout. */
export const guestDetailsSchema = z
  .object({
    fullName: z.string().trim().min(2, 'nameRequired').max(120),
    email: z.union([z.email('emailInvalid'), z.literal('')]).optional(),
    phone: z.union([z.string().trim().min(6, 'phoneInvalid').max(30), z.literal('')]).optional(),
    note: z.string().trim().max(500).optional(),
  })
  // Guest checkout puede traer email O teléfono, pero al menos uno: sin contacto
  // no hay cómo mandar el recordatorio (mismo criterio que el CHECK de customers).
  .refine((d) => Boolean(d.email) || Boolean(d.phone), {
    message: 'contactRequired',
    path: ['email'],
  });

export type GuestDetails = z.infer<typeof guestDetailsSchema>;

/** Input del server action que crea la reserva. */
export const createBookingInputSchema = z.object({
  businessId: uuid(),
  serviceId: uuid(),
  /** null = "cualquier profesional": el action lo resuelve a uno concreto. */
  staffMemberId: uuid().nullable(),
  /** Instante UTC del inicio del servicio (ISO 8601). */
  startsAt: isoDateTime(),
  guest: guestDetailsSchema,
  locale: localeSchema,
  source: bookingSourceSchema,
});

export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;

/** Input para pedir slots de una semana. */
export const slotsInputSchema = z.object({
  businessId: uuid(),
  serviceId: uuid(),
  staffMemberId: uuid().nullable(),
  /** Límites UTC del rango a calcular (ISO 8601). */
  fromIso: isoDateTime(),
  toIso: isoDateTime(),
});

export type SlotsInput = z.infer<typeof slotsInputSchema>;

export const cancelBookingInputSchema = z.object({
  token: uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const rescheduleBookingInputSchema = z.object({
  token: uuid(),
  startsAt: isoDateTime(),
  staffMemberId: uuid(),
});
