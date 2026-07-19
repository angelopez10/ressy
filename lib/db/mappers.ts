/**
 * Frontera snake_case (DB) ↔ camelCase (TS) — CLAUDE.md §4.
 *
 * Regla: los tipos de `./types.ts` (snake_case) NO deben cruzar esta capa. Un
 * `booking.starts_at` en un componente significa que alguien se saltó el mapeo.
 *
 * El patrón es explícito y no genérico a propósito. Un `camelize()` automático
 * con tipos condicionales se ve elegante, pero convierte cada error de nombre
 * en un error de tipos ilegible y no deja anotar cada campo con su unidad
 * (¿UTC o local? ¿centavos o pesos?), que es justo lo que se olvida.
 */

import type { Enums, Tables } from './types';

// ---------------------------------------------------------------------------
// Modelos de dominio
// ---------------------------------------------------------------------------

export type Business = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  /** IANA. Toda hora de este negocio se renderiza en esta zona. */
  timezone: string;
  /** ISO 4217. */
  currency: string;
  bookingLocale: 'es' | 'en';
  logoUrl: string | null;
  accentColor: string | null;
  isPublished: boolean;
};

export type Service = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMin: number;
  /** Integer en la unidad menor de Business.currency. Formatear con Intl.NumberFormat. */
  priceAmount: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  isActive: boolean;
  sortOrder: number;
};

export type StaffMember = {
  id: string;
  businessId: string;
  userId: string | null;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  canViewAllBookings: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type Customer = {
  id: string;
  businessId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  /** Nota interna del negocio. Nunca renderizar en la booking page. */
  notes: string | null;
  tags: string[];
  locale: 'es' | 'en';
};

export type Booking = {
  id: string;
  businessId: string;
  serviceId: string;
  staffMemberId: string;
  customerId: string;
  /** UTC. Renderizar con Intl.DateTimeFormat en Business.timezone. */
  startsAt: Date;
  endsAt: Date;
  status: Enums<'booking_status'>;
  source: Enums<'booking_source'>;
  notes: string | null;
  internalNotes: string | null;
  /** Snapshot al reservar, no el precio actual del servicio. */
  priceAmount: number;
  currency: string;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  rescheduledFromBookingId: string | null;
};

/** Horario recurrente. `startTime`/`endTime` son hora LOCAL del negocio. */
export type StaffSchedule = {
  id: string;
  businessId: string;
  staffMemberId: string;
  /** ISO-8601: 1=lunes … 7=domingo. */
  weekday: number;
  /** 'HH:MM:SS' en la timezone del negocio. NO es un instante. */
  startTime: string;
  endTime: string;
};

export type BusinessHours = {
  id: string;
  businessId: string;
  weekday: number;
  /** 'HH:MM:SS' local. */
  openTime: string;
  closeTime: string;
};

export type BusinessPolicies = {
  businessId: string;
  minLeadTimeMin: number;
  maxAdvanceDays: number;
  cancellationWindowHours: number;
  depositType: Enums<'deposit_type'>;
  depositPercent: number | null;
  depositAmount: number | null;
  noShowFeeAmount: number;
};

// ---------------------------------------------------------------------------
// Mappers  (Row → dominio)
// ---------------------------------------------------------------------------

function asLocale(value: string): 'es' | 'en' {
  // La DB lo restringe con un CHECK, pero el tipo generado es `string`.
  return value === 'en' ? 'en' : 'es';
}

export function toBusiness(row: Tables<'businesses'>): Business {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    timezone: row.timezone,
    currency: row.currency,
    bookingLocale: asLocale(row.booking_locale),
    logoUrl: row.logo_url,
    accentColor: row.accent_color,
    isPublished: row.is_published,
  };
}

export function toService(row: Tables<'services'>): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    durationMin: row.duration_min,
    priceAmount: row.price_amount,
    bufferBeforeMin: row.buffer_before_min,
    bufferAfterMin: row.buffer_after_min,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function toStaffMember(row: Tables<'staff_members'>): StaffMember {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    canViewAllBookings: row.can_view_all_bookings,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function toCustomer(row: Tables<'customers'>): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    tags: row.tags,
    locale: asLocale(row.locale),
  };
}

export function toBooking(row: Tables<'bookings'>): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    staffMemberId: row.staff_member_id,
    customerId: row.customer_id,
    // Postgres devuelve timestamptz como ISO con offset; `new Date` lo parsea a
    // un instante absoluto. La timezone del negocio se aplica al FORMATEAR, no
    // aquí (CLAUDE.md §3: nunca usar la tz del browser para calcular).
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    status: row.status,
    source: row.source,
    notes: row.notes,
    internalNotes: row.internal_notes,
    priceAmount: row.price_amount,
    currency: row.currency,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    cancellationReason: row.cancellation_reason,
    rescheduledFromBookingId: row.rescheduled_from_booking_id,
  };
}

export function toStaffSchedule(row: Tables<'staff_schedules'>): StaffSchedule {
  return {
    id: row.id,
    businessId: row.business_id,
    staffMemberId: row.staff_member_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

export function toBusinessHours(row: Tables<'business_hours'>): BusinessHours {
  return {
    id: row.id,
    businessId: row.business_id,
    weekday: row.weekday,
    openTime: row.open_time,
    closeTime: row.close_time,
  };
}

export function toBusinessPolicies(row: Tables<'business_policies'>): BusinessPolicies {
  return {
    businessId: row.business_id,
    minLeadTimeMin: row.min_lead_time_min,
    maxAdvanceDays: row.max_advance_days,
    cancellationWindowHours: row.cancellation_window_hours,
    depositType: row.deposit_type,
    depositPercent: row.deposit_percent,
    depositAmount: row.deposit_amount,
    noShowFeeAmount: row.no_show_fee_amount,
  };
}

// ---------------------------------------------------------------------------
// Formateo
// ---------------------------------------------------------------------------

/**
 * Formatea un monto guardado en la unidad menor. Delega en Intl el número de
 * decimales: CLP no tiene, USD tiene 2. Hardcodear /100 sería un bug para CLP,
 * JPY y compañía.
 */
export function formatMoney(amount: number, currency: string, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  return formatter.format(amount / 10 ** digits);
}

/** Formatea un instante UTC en la timezone del negocio (CLAUDE.md §3). */
export function formatInBusinessTimezone(
  instant: Date,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone }).format(instant);
}
