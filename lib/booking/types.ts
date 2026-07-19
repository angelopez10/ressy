/**
 * DTOs y resultados del flujo de reserva que cruzan la frontera server action →
 * cliente. Todo serializable: instantes como ISO string (UTC), nunca `Date` ni
 * clases. Los componentes reconstruyen `Date` solo para formatear con la tz del
 * negocio.
 */

import type { Enums } from '@/lib/db/types';

/** Un slot listo para renderizar. Instantes en ISO UTC + tz del negocio. */
export interface SlotDTO {
  startsAtIso: string;
  endsAtIso: string;
  timezone: string;
  /** Staff asignado (menor sortOrder entre los libres, en modo "cualquiera"). */
  staffMemberId: string;
  /** Todos los que podrían tomarlo. Para reintentar en carrera de "cualquiera". */
  availableStaffIds: string[];
}

/** Razones de fallo compartidas por crear/reagendar. Cada una tiene copy propio. */
export type BookingFailure =
  /** El constraint de exclusión rechazó: alguien tomó el slot entremedio. */
  | 'slot_taken'
  /** El slot ya no existe (horario/override cambió) o cae fuera de políticas. */
  | 'slot_unavailable'
  /** Ni email ni teléfono: no hay cómo mandar el recordatorio. */
  | 'contact_required'
  /** Fuera de la ventana de cancelación/reagende del negocio. */
  | 'outside_window'
  /** El token no corresponde a ninguna reserva. */
  | 'not_found'
  /** La reserva ya no está en un estado desde el que el cliente pueda operar. */
  | 'invalid_transition'
  /** Error inesperado. */
  | 'error';

export type CreateBookingResult =
  | { ok: true; token: string; status: Enums<'booking_status'> }
  | { ok: false; reason: BookingFailure };

export type MutateBookingResult =
  { ok: true; status: Enums<'booking_status'> } | { ok: false; reason: BookingFailure };

// ---------------------------------------------------------------------------
// Bundle que el server component pasa al wizard cliente (todo serializable)
// ---------------------------------------------------------------------------

export interface BookingBusinessDTO {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  /** IANA. Toda hora se renderiza aquí (CLAUDE.md §3). */
  timezone: string;
  currency: string;
  accentColor: string | null;
  logoUrl: string | null;
  /** Resumen legible del horario de atención (derivado de business_hours). */
  hoursSummary: string | null;
}

export interface BookingServiceDTO {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceAmount: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

export interface BookingStaffDTO {
  id: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
}

export interface BookingPoliciesDTO {
  depositType: 'none' | 'percent' | 'fixed';
  depositPercent: number | null;
  depositAmount: number | null;
  cancellationWindowHours: number;
  minLeadTimeMin: number;
  maxAdvanceDays: number;
}

export interface BookingBundle {
  business: BookingBusinessDTO;
  policies: BookingPoliciesDTO;
  services: BookingServiceDTO[];
  staff: BookingStaffDTO[];
  /** serviceId → ids de staff habilitado (orden por sortOrder). */
  serviceStaff: Record<string, string[]>;
}

/** Vista de una reserva para la pantalla de gestión (via get_public_booking). */
export interface PublicBookingView {
  status: Enums<'booking_status'>;
  startsAtIso: string;
  endsAtIso: string;
  businessId: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMin: number;
  staffMemberId: string;
  staffName: string;
  businessName: string;
  businessSlug: string;
  timezone: string;
  currency: string;
  priceAmount: number;
  cancellationWindowHours: number | null;
  customerName: string;
}
