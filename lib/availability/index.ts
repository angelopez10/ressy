/**
 * Motor de disponibilidad de Ressy (CLAUDE.md §3). Superficie pública.
 *
 *   slots = horario_staff ∩ horario_negocio − bookings − bloqueos − gcal
 *
 * Lo puro (`computeAvailability`) se prueba con el seed sin DB; `getAvailableSlots`
 * orquesta con un `AvailabilityDataSource`. Ver los comentarios de cada módulo.
 */

export { computeAvailability, getAvailableSlots } from './engine';
export { NoopExternalBusyProvider } from './external-busy';
export { SupabaseAvailabilityDataSource } from './source.supabase';
export { PublicAvailabilityDataSource } from './source.public';
// La confirmación real es el server action `createBooking` (lib/booking/actions).
// Aquí solo queda el contrato de tipos.
export type { ConfirmBookingInput, ConfirmBookingReason } from './confirm';
export type {
  AvailabilityDataSource,
  AvailabilityInput,
  AvailabilityQuery,
  BusyInterval,
  ExternalBusyProvider,
  OverrideInterval,
  Slot,
} from './types';
