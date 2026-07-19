/**
 * Contrato público del motor de disponibilidad.
 *
 * Regla de husos (CLAUDE.md §3): todo lo que ENTRA y SALE del motor en forma de
 * instante es UTC (`Date`). El motor nunca formatea a string local ni asume la
 * tz del servidor; la capa de presentación formatea usando `Slot.timezone`.
 */

import type {
  BusinessHours,
  BusinessPolicies,
  Service,
  StaffMember,
  StaffSchedule,
} from '@/lib/db/mappers';
import type { Enums } from '@/lib/db/types';

/** Un slot ofrecible al cliente. Instantes en UTC + la tz para renderizar. */
export interface Slot {
  /** UTC — inicio del cuerpo del servicio (sin buffers). */
  startsAt: Date;
  /** UTC — `startsAt` + `service.durationMin`. */
  endsAt: Date;
  /** IANA del negocio. La presentación formatea con esto (nunca la tz del browser). */
  timezone: string;
  /**
   * Staff que quedaría asignado. En modo "cualquier profesional" es el de menor
   * `sortOrder` entre los disponibles; la asignación definitiva se fija al
   * confirmar (ver `confirm.ts`).
   */
  staffMemberId: string;
  /** Todos los staff que podrían tomar este slot. En modo staff fijo, un solo id. */
  availableStaffIds: string[];
}

/** Parámetros de una consulta de disponibilidad. */
export interface AvailabilityQuery {
  businessId: string;
  /** Define duración + buffers del slot. */
  serviceId: string;
  /** Omitido = "cualquier profesional": basta con que un staff habilitado esté libre. */
  staffMemberId?: string;
  /** UTC, inclusivo. */
  from: Date;
  /** UTC, exclusivo. */
  to: Date;
  /** Reloj inyectable para tests deterministas. Default: `new Date()`. */
  now?: Date;
  /** Paso de la grilla en minutos. Default: `service.durationMin` (back-to-back). */
  stepMin?: number;
}

/** Un tramo ocupado de un profesional (reserva viva o evento externo). UTC. */
export interface BusyInterval {
  staffMemberId: string;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Override de horario ya resuelto a instantes UTC. `staffMemberId: null` =
 * aplica a todo el negocio (feriado, cierre). `kind` decide si suma o resta
 * disponibilidad.
 */
export interface OverrideInterval {
  staffMemberId: string | null;
  kind: Enums<'override_kind'>; // 'unavailable' | 'available'
  startsAt: Date;
  endsAt: Date;
}

/**
 * Todo lo que el motor necesita para calcular, ya cargado. Es la salida de
 * `AvailabilityDataSource.load` y la entrada de `computeAvailability`. Separarlo
 * es lo que hace al cálculo puro y testeable con el seed, sin DB ni reloj real.
 *
 * Precondiciones que garantiza el data source (no las revalida el motor):
 *   - `staff` = solo miembros ACTIVOS habilitados para `service` (vía service_staff).
 *   - `bookings` = solo estados que bloquean (ACTIVE_BOOKING_STATUSES).
 *   - Todas las filas pertenecen a `business` (RLS + filtro por tenant).
 */
export interface AvailabilityInput {
  business: { id: string; timezone: string };
  service: Service;
  staff: StaffMember[];
  businessHours: BusinessHours[];
  staffSchedules: StaffSchedule[];
  overrides: OverrideInterval[];
  bookings: BusyInterval[];
  externalBusy: BusyInterval[];
  policies: Pick<BusinessPolicies, 'minLeadTimeMin' | 'maxAdvanceDays'>;
}

/**
 * Aísla el acceso a datos. En producción lo implementa Supabase
 * (`source.supabase.ts`); en tests, un objeto en memoria construido desde el
 * seed. El motor solo conoce esta interfaz.
 */
export interface AvailabilityDataSource {
  load(query: AvailabilityQuery): Promise<AvailabilityInput>;
}

/**
 * Punto de extensión para restar ocupación externa (Google Calendar, CLAUDE.md
 * §3 · fórmula). En esta sesión solo existe la implementación no-op; integrar
 * Google es trabajo posterior.
 */
export interface ExternalBusyProvider {
  getBusyIntervals(query: {
    businessId: string;
    staffMemberIds: string[];
    from: Date;
    to: Date;
  }): Promise<BusyInterval[]>;
}
