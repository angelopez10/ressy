import 'server-only';

/**
 * Lecturas del calendario del dashboard.
 *
 * Con el cliente de RLS, la política `members read bookings` sigue haciendo el
 * trabajo de permisos DENTRO del negocio: un staff sin `can_view_all_bookings`
 * recibe solo sus reservas. Eso no cambia.
 *
 * Lo que sí se agregó es el filtro EXPLÍCITO por `business_id` en cada query
 * (CLAUDE.md §3). No reemplaza a RLS —son capas, no alternativas—: existe
 * porque bajo una impersonación de soporte el cliente es elevado y RLS no
 * acota. Para un usuario normal el filtro es redundante y no cambia resultados.
 *
 * Se carga únicamente el rango visible (día o semana), indexado por
 * `bookings_business_starts_idx`.
 */

import { parseAnchor, rangeFor, anchorToDateString } from './grid';
import { getTenantDb, resolveTenant } from './tenant';
import type {
  AgendaBundle,
  AgendaBookingDTO,
  AgendaOverrideDTO,
  CalendarView,
  CustomerHistoryDTO,
} from './types';

/** Rango horario de la grilla a partir de business_hours. Fallback 8–20. */
function hourRange(rows: { open_time: string; close_time: string }[]): {
  startHour: number;
  endHour: number;
} {
  if (rows.length === 0) return { startHour: 8, endHour: 20 };
  let min = 24;
  let max = 0;
  for (const r of rows) {
    const open = Number(r.open_time.slice(0, 2));
    const close = Number(r.close_time.slice(0, 2));
    const closeCeil = r.close_time.slice(3, 5) === '00' ? close : close + 1;
    if (open < min) min = open;
    if (closeCeil > max) max = closeCeil;
  }
  // Un poco de aire arriba y abajo, sin salirse del día.
  const startHour = Math.max(0, Math.min(min, 22));
  const endHour = Math.min(24, Math.max(max, startHour + 1));
  return { startHour, endHour };
}

type BookingRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AgendaBookingDTO['status'];
  source: AgendaBookingDTO['source'];
  staff_member_id: string;
  service_id: string;
  customer_id: string;
  notes: string | null;
  price_amount: number;
  currency: string;
  services: { name: string; duration_min: number } | null;
  customers: { full_name: string; phone: string | null; email: string | null } | null;
};

/**
 * Carga el bundle del calendario para (view, anchorDate). `anchorDate` es
 * 'YYYY-MM-DD' en la tz del negocio; si viene inválido, cae a hoy.
 */
export async function getAgenda(
  view: CalendarView,
  anchorDate: string | undefined,
): Promise<AgendaBundle | null> {
  // Resuelve el tenant y el cliente en un solo lugar: bajo impersonación de
  // soporte el negocio no sale de la sesión del usuario (CLAUDE.md §3).
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const { db, businessId } = tenant;

  const { data: bizRow } = await db
    .from('businesses')
    .select('id, slug, name, timezone, currency, booking_locale')
    .eq('id', businessId)
    .single();
  if (!bizRow) return null;

  const timezone = bizRow.timezone;
  const anchor = parseAnchor(anchorDate, timezone);
  const { start, end } = rangeFor(view, anchor);
  const fromIso = start.toUTC().toISO()!;
  const toIso = end.toUTC().toISO()!;

  // Datos estáticos del negocio + reservas/overrides del rango, en paralelo.
  const [staffRes, servicesRes, serviceStaffRes, hoursRes, bookingsRes, overridesRes] =
    await Promise.all([
      db
        .from('staff_members')
        .select('id, name, role, sort_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db
        .from('services')
        .select('id, name, duration_min, price_amount, sort_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db.from('service_staff').select('service_id, staff_member_id').eq('business_id', businessId),
      db.from('business_hours').select('open_time, close_time').eq('business_id', businessId),
      db
        .from('bookings')
        .select(
          'id, starts_at, ends_at, status, source, staff_member_id, service_id, customer_id, notes, price_amount, currency, services(name, duration_min), customers(full_name, phone, email)',
        )
        .eq('business_id', businessId)
        .gte('starts_at', fromIso)
        .lt('starts_at', toIso)
        .order('starts_at', { ascending: true }),
      db
        .from('schedule_overrides')
        .select('id, staff_member_id, kind, starts_at, ends_at, reason')
        .eq('business_id', businessId)
        .lt('starts_at', toIso)
        .gt('ends_at', fromIso),
    ]);

  const { startHour, endHour } = hourRange(hoursRes.data ?? []);

  // serviceId → staff habilitado, respetando el orden de sort_order del staff.
  const staffOrder = new Map((staffRes.data ?? []).map((s) => [s.id, s.sort_order]));
  const serviceStaff: Record<string, string[]> = {};
  for (const row of serviceStaffRes.data ?? []) {
    (serviceStaff[row.service_id] ??= []).push(row.staff_member_id);
  }
  for (const list of Object.values(serviceStaff)) {
    list.sort((a, b) => (staffOrder.get(a) ?? 0) - (staffOrder.get(b) ?? 0));
  }

  const bookings: AgendaBookingDTO[] = ((bookingsRes.data as unknown as BookingRow[] | null) ?? []).map(
    (r) => ({
      id: r.id,
      startsAtIso: r.starts_at,
      endsAtIso: r.ends_at,
      status: r.status,
      source: r.source,
      staffMemberId: r.staff_member_id,
      serviceId: r.service_id,
      serviceName: r.services?.name ?? '—',
      durationMin: r.services?.duration_min ?? 30,
      customerId: r.customer_id,
      customerName: r.customers?.full_name ?? '—',
      customerPhone: r.customers?.phone ?? null,
      customerEmail: r.customers?.email ?? null,
      note: r.notes,
      priceAmount: r.price_amount,
      currency: r.currency,
    }),
  );

  const overrides: AgendaOverrideDTO[] = (overridesRes.data ?? []).map((r) => ({
    id: r.id,
    staffMemberId: r.staff_member_id,
    kind: r.kind,
    startsAtIso: r.starts_at,
    endsAtIso: r.ends_at,
    reason: r.reason,
  }));

  return {
    business: {
      id: bizRow.id,
      slug: bizRow.slug,
      name: bizRow.name,
      timezone,
      currency: bizRow.currency,
      bookingLocale: bizRow.booking_locale === 'en' ? 'en' : 'es',
    },
    view,
    anchorDate: anchorToDateString(anchor),
    rangeFromIso: fromIso,
    rangeToIso: toIso,
    startHour,
    endHour,
    staff: (staffRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      sortOrder: s.sort_order,
    })),
    services: (servicesRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.duration_min,
      priceAmount: s.price_amount,
    })),
    serviceStaff,
    bookings,
    overrides,
  };
}

/**
 * Mini-historial del cliente (mini-CRM) para el panel de detalle. `visits` =
 * reservas completadas; `noShows` = no-shows; `totalSpent` = suma de completadas.
 *
 * `businessId` lo resuelve el SERVIDOR (nunca llega del cliente) y se aplica
 * como filtro explícito: sin él, un `customerId` arbitrario devolvería el
 * historial de otro negocio en cuanto el cliente sea el elevado.
 */
export async function getCustomerHistory(
  customerId: string,
  currency: string,
  businessId: string,
): Promise<CustomerHistoryDTO> {
  const db = await getTenantDb();
  const { data } = await db
    .from('bookings')
    .select('status, price_amount')
    .eq('business_id', businessId)
    .eq('customer_id', customerId);

  let visits = 0;
  let noShows = 0;
  let totalSpent = 0;
  for (const b of data ?? []) {
    if (b.status === 'completed') {
      visits += 1;
      totalSpent += b.price_amount;
    } else if (b.status === 'no_show') {
      noShows += 1;
    }
  }
  return { visits, noShows, totalSpent, currency };
}
