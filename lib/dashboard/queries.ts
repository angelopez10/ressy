import 'server-only';

/**
 * Lecturas del calendario del dashboard. Todo pasa por el cliente autenticado de
 * Supabase, así que la RLS de la sesión 06 hace el trabajo de tenant Y de
 * permisos: un staff sin `can_view_all_bookings` recibe SOLO sus reservas
 * (política `members read bookings`). Aquí no se re-filtra por negocio a mano;
 * confiar en un filtro de app en vez de RLS sería el bug que CLAUDE.md §9
 * previene.
 *
 * Se carga únicamente el rango visible (día o semana), indexado por
 * `bookings_business_starts_idx`.
 */

import { createClient } from '@/lib/db/server';
import { getUserBusiness } from '@/lib/auth/session';
import { parseAnchor, rangeFor, anchorToDateString } from './grid';
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
  const base = await getUserBusiness();
  if (!base) return null;

  const db = await createClient();

  // Fila completa del negocio para tz/moneda/locale (getUserBusiness no las trae).
  const { data: bizRow } = await db
    .from('businesses')
    .select('id, slug, name, timezone, currency, booking_locale')
    .eq('id', base.id)
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
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db
        .from('services')
        .select('id, name, duration_min, price_amount, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db.from('service_staff').select('service_id, staff_member_id'),
      db.from('business_hours').select('open_time, close_time'),
      db
        .from('bookings')
        .select(
          'id, starts_at, ends_at, status, source, staff_member_id, service_id, customer_id, notes, price_amount, currency, services(name, duration_min), customers(full_name, phone, email)',
        )
        .gte('starts_at', fromIso)
        .lt('starts_at', toIso)
        .order('starts_at', { ascending: true }),
      db
        .from('schedule_overrides')
        .select('id, staff_member_id, kind, starts_at, ends_at, reason')
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
 * RLS acota a los clientes del negocio del usuario.
 */
export async function getCustomerHistory(
  customerId: string,
  currency: string,
): Promise<CustomerHistoryDTO> {
  const db = await createClient();
  const { data } = await db
    .from('bookings')
    .select('status, price_amount')
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
