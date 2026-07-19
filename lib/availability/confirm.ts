/**
 * Contrato de confirmación de reserva.
 *
 * En 03A esto era un stub que lanzaba "pendiente 03B". En 03B la implementación
 * real vive en `lib/booking/actions.ts` como el server action `createBooking`,
 * porque la escritura pasa por una función SECURITY DEFINER de Postgres
 * (migración 07) y necesita el cliente de servidor con la sesión — no encaja en
 * la firma `(source, input)` que se había esbozado.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONCURRENCIA (CLAUDE.md §3) — sigue vigente y es donde de verdad se resuelve:
 * ─────────────────────────────────────────────────────────────────────────────
 * El motor calcula slots, pero su resultado es SIEMPRE consultivo: entre que el
 * cliente ve el slot y confirma, otro puede tomarlo. La garantía real es el
 * constraint de exclusión `bookings_no_overlap` (migración 04). `createBooking`
 * lo traduce a `slot_taken` y, en modo "cualquier profesional", reintenta con
 * otro staff libre antes de rendirse.
 *
 * Este módulo se queda solo con los TIPOS del contrato, para que sirvan de
 * referencia estable. Ver `lib/booking/types.ts` para el resultado que consume
 * la UI.
 */

/** Datos mínimos para materializar una reserva. */
export interface ConfirmBookingInput {
  businessId: string;
  serviceId: string;
  /** Staff concreto. En modo "cualquier profesional" la capa de acción lo resuelve. */
  staffMemberId: string | null;
  /** UTC — inicio del cuerpo del servicio. `endsAt` se deriva de la duración. */
  startsAt: Date;
  /** Idioma del cliente final, para sus recordatorios (CLAUDE.md §6). */
  locale: 'es' | 'en';
  note?: string;
}

export type ConfirmBookingReason = 'slot_taken' | 'slot_unavailable' | 'contact_required' | 'error';
