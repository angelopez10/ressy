/**
 * DTOs del calendario del dashboard que cruzan la frontera server → client.
 * Todo serializable: instantes como ISO string (UTC), nunca `Date`. La tz del
 * negocio se aplica al FORMATEAR en el cliente (CLAUDE.md §3), nunca la del
 * browser.
 */

import type { Enums } from '@/lib/db/types';
import type { BookingFailure } from '@/lib/booking/types';

export type CalendarView = 'day' | 'week';

/** Una reserva lista para pintar en la grilla. */
export interface AgendaBookingDTO {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  status: Enums<'booking_status'>;
  source: Enums<'booking_source'>;
  staffMemberId: string;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  /** Nota del cliente al reservar. */
  note: string | null;
  priceAmount: number;
  currency: string;
}

/** Un bloqueo (schedule_override) en el rango visible. */
export interface AgendaOverrideDTO {
  id: string;
  /** null = aplica a todo el negocio. */
  staffMemberId: string | null;
  kind: Enums<'override_kind'>;
  startsAtIso: string;
  endsAtIso: string;
  reason: string | null;
}

export interface AgendaStaffDTO {
  id: string;
  name: string;
  role: string | null;
  sortOrder: number;
}

export interface AgendaServiceDTO {
  id: string;
  name: string;
  durationMin: number;
  priceAmount: number;
}

/**
 * Todo lo que el server component pasa al calendario cliente para un rango. Las
 * reservas/overrides son solo del rango visible (CLAUDE.md: paginar por fecha).
 */
export interface AgendaBundle {
  business: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    currency: string;
    bookingLocale: 'es' | 'en';
  };
  view: CalendarView;
  /** Día ancla en la tz del negocio, 'YYYY-MM-DD'. */
  anchorDate: string;
  /** Límites UTC del rango cargado (ISO). */
  rangeFromIso: string;
  rangeToIso: string;
  /** Rango horario de la grilla, derivado de business_hours (fallback 8–20). */
  startHour: number;
  endHour: number;
  staff: AgendaStaffDTO[];
  services: AgendaServiceDTO[];
  /** serviceId → ids de staff habilitado (orden por sortOrder). Para reserva manual. */
  serviceStaff: Record<string, string[]>;
  bookings: AgendaBookingDTO[];
  overrides: AgendaOverrideDTO[];
}

/** Mini-historial del cliente para el panel de detalle (mini-CRM). */
export interface CustomerHistoryDTO {
  visits: number;
  noShows: number;
  totalSpent: number;
  currency: string;
}

export type AgendaFailureReason = BookingFailure | 'not_authorized' | 'invalid_range';

export type AgendaActionResult = { ok: true } | { ok: false; reason: AgendaFailureReason };

export type CreateManualBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; reason: AgendaFailureReason };
