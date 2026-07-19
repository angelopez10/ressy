import 'server-only';

/**
 * Datos de la pantalla Home / Resumen. Todo RLS-scoped (el usuario ve solo su
 * negocio y, si es staff limitado, solo su columna). "Hoy" y "esta semana" se
 * calculan en la tz del negocio con Luxon (CLAUDE.md §3), nunca la del server.
 */

import { DateTime } from 'luxon';
import { createClient } from '@/lib/db/server';
import type { DashboardContext } from './context';
import type { Enums } from '@/lib/db/types';

const LIVE: Enums<'booking_status'>[] = ['pending_payment', 'confirmed', 'rescheduled'];
const REVENUE: Enums<'booking_status'>[] = ['confirmed', 'rescheduled', 'completed'];

export interface UpcomingBooking {
  id: string;
  startsAtIso: string;
  status: Enums<'booking_status'>;
  serviceName: string;
  customerName: string;
}

export interface HomeData {
  isEmpty: boolean;
  bookingsToday: number;
  revenueToday: number;
  occupancyPct: number;
  newClientsWeek: number;
  upcoming: UpcomingBooking[];
  pendingPayment: number;
  recentNoShows: number;
}

export async function getHomeData(ctx: DashboardContext): Promise<HomeData> {
  const db = await createClient();
  const tz = ctx.business.timezone;
  const now = DateTime.now().setZone(tz);
  const dayStart = now.startOf('day');
  const dayEnd = dayStart.plus({ days: 1 });
  const weekAgo = now.minus({ days: 7 });
  const fromIso = dayStart.toUTC().toISO()!;
  const toIso = dayEnd.toUTC().toISO()!;
  const nowIso = now.toUTC().toISO()!;
  const weekAgoIso = weekAgo.toUTC().toISO()!;
  const isoWeekday = now.weekday; // 1..7

  const [totalRes, todayRes, upcomingRes, pendingRes, noShowRes, newClientsRes, staffRes, hoursRes] =
    await Promise.all([
      db.from('bookings').select('id', { count: 'exact', head: true }).eq('business_id', ctx.business.id),
      db
        .from('bookings')
        .select('status, price_amount, starts_at, ends_at')
        .gte('starts_at', fromIso)
        .lt('starts_at', toIso),
      db
        .from('bookings')
        .select('id, starts_at, status, services(name), customers(full_name)')
        .in('status', LIVE)
        .gte('starts_at', nowIso)
        .lt('starts_at', toIso)
        .order('starts_at', { ascending: true })
        .limit(6),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_payment')
        .gte('starts_at', nowIso),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'no_show')
        .gte('starts_at', weekAgoIso),
      db
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgoIso),
      db.from('staff_members').select('id', { count: 'exact', head: true }).eq('is_active', true),
      db.from('business_hours').select('open_time, close_time').eq('weekday', isoWeekday),
    ]);

  const today = todayRes.data ?? [];
  const bookingsToday = today.filter((b) => b.status !== 'cancelled_by_client' && b.status !== 'cancelled_by_business').length;
  const revenueToday = today
    .filter((b) => REVENUE.includes(b.status))
    .reduce((sum, b) => sum + b.price_amount, 0);

  // Ocupación ≈ minutos reservados hoy / (staff activo × minutos de apertura hoy).
  const bookedMin = today
    .filter((b) => LIVE.includes(b.status) || b.status === 'completed')
    .reduce((sum, b) => sum + DateTime.fromISO(b.ends_at).diff(DateTime.fromISO(b.starts_at), 'minutes').minutes, 0);
  const openMin = (hoursRes.data ?? []).reduce((sum, h) => {
    const open = Number(h.open_time.slice(0, 2)) * 60 + Number(h.open_time.slice(3, 5));
    const close = Number(h.close_time.slice(0, 2)) * 60 + Number(h.close_time.slice(3, 5));
    return sum + Math.max(0, close - open);
  }, 0);
  const staffCount = staffRes.count ?? 1;
  const capacity = staffCount * (openMin || 480);
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((bookedMin / capacity) * 100)) : 0;

  const upcoming: UpcomingBooking[] = (
    (upcomingRes.data as unknown as {
      id: string;
      starts_at: string;
      status: Enums<'booking_status'>;
      services: { name: string } | null;
      customers: { full_name: string } | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    startsAtIso: r.starts_at,
    status: r.status,
    serviceName: r.services?.name ?? '—',
    customerName: r.customers?.full_name ?? '—',
  }));

  return {
    isEmpty: (totalRes.count ?? 0) === 0,
    bookingsToday,
    revenueToday,
    occupancyPct,
    newClientsWeek: newClientsRes.count ?? 0,
    upcoming,
    pendingPayment: pendingRes.count ?? 0,
    recentNoShows: noShowRes.count ?? 0,
  };
}
