import 'server-only';

/**
 * Agregados de Reportes. RLS acota al negocio (y a la columna del staff si su
 * permiso es limitado). Todo se cuenta en la tz del negocio (buckets por día
 * local). Rangos calculados con Luxon.
 */

import { DateTime } from 'luxon';
import { getTenantDb } from './tenant';
import type { Enums } from '@/lib/db/types';

export type ReportRange = 'last7' | 'last30' | 'thisMonth' | 'thisYear';

export interface Point {
  label: string;
  value: number;
}

export interface ReportsData {
  isEmpty: boolean;
  totalBookings: number;
  revenue: number;
  noShowRate: number;
  avgTicket: number;
  revenueByDay: Point[];
  bookingsByDay: Point[];
  topServices: Point[];
  bySource: Point[];
  byStaff: Point[];
  newClients: number;
  returningClients: number;
}

const REVENUE: Enums<'booking_status'>[] = ['confirmed', 'rescheduled', 'completed'];

export function rangeToUtc(range: ReportRange, tz: string): { fromIso: string; toIso: string } {
  const now = DateTime.now().setZone(tz);
  let from: DateTime;
  const to = now.endOf('day');
  switch (range) {
    case 'last7':
      from = now.minus({ days: 6 }).startOf('day');
      break;
    case 'last30':
      from = now.minus({ days: 29 }).startOf('day');
      break;
    case 'thisMonth':
      from = now.startOf('month');
      break;
    case 'thisYear':
      from = now.startOf('year');
      break;
  }
  return { fromIso: from.toUTC().toISO()!, toIso: to.toUTC().toISO()! };
}

type Row = {
  status: Enums<'booking_status'>;
  price_amount: number;
  starts_at: string;
  service_id: string;
  staff_member_id: string;
  customer_id: string;
  source: Enums<'booking_source'>;
};

export async function getReports(
  businessId: string,
  tz: string,
  fromIso: string,
  toIso: string,
): Promise<ReportsData> {
  const db = await getTenantDb();
  const [{ data: rows }, { data: services }, { data: staff }, { count: newCount }] = await Promise.all([
    db
      .from('bookings')
      .select('status, price_amount, starts_at, service_id, staff_member_id, customer_id, source')
      .eq('business_id', businessId)
      .gte('starts_at', fromIso)
      .lte('starts_at', toIso),
    db.from('services').select('id, name').eq('business_id', businessId),
    db.from('staff_members').select('id, name').eq('business_id', businessId),
    db
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso),
  ]);

  const bookings = (rows as Row[] | null) ?? [];
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const staffName = new Map((staff ?? []).map((s) => [s.id, s.name]));

  const totalBookings = bookings.length;
  const revenue = bookings.filter((b) => REVENUE.includes(b.status)).reduce((s, b) => s + b.price_amount, 0);
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const noShows = bookings.filter((b) => b.status === 'no_show').length;
  const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0;
  const avgTicket = completed > 0 ? Math.round(revenue / completed) : 0;

  // Series por día local.
  const dayRevenue = new Map<string, number>();
  const dayCount = new Map<string, number>();
  const svc = new Map<string, number>();
  const src = new Map<string, number>();
  const byStaffMap = new Map<string, number>();
  const customers = new Set<string>();

  for (const b of bookings) {
    const day = DateTime.fromISO(b.starts_at, { zone: 'utc' }).setZone(tz).toFormat('MM-dd');
    dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
    if (REVENUE.includes(b.status)) dayRevenue.set(day, (dayRevenue.get(day) ?? 0) + b.price_amount);
    svc.set(b.service_id, (svc.get(b.service_id) ?? 0) + 1);
    src.set(b.source, (src.get(b.source) ?? 0) + 1);
    byStaffMap.set(b.staff_member_id, (byStaffMap.get(b.staff_member_id) ?? 0) + 1);
    customers.add(b.customer_id);
  }

  // Eje de días continuo.
  const from = DateTime.fromISO(fromIso, { zone: 'utc' }).setZone(tz).startOf('day');
  const to = DateTime.fromISO(toIso, { zone: 'utc' }).setZone(tz).startOf('day');
  const days: string[] = [];
  for (let d = from; d <= to; d = d.plus({ days: 1 })) days.push(d.toFormat('MM-dd'));
  // Limita el eje a ~31 puntos para legibilidad.
  const axis = days.length > 31 ? days.filter((_, i) => i % Math.ceil(days.length / 31) === 0) : days;

  const revenueByDay: Point[] = axis.map((d) => ({ label: d, value: dayRevenue.get(d) ?? 0 }));
  const bookingsByDay: Point[] = axis.map((d) => ({ label: d, value: dayCount.get(d) ?? 0 }));

  const topServices: Point[] = [...svc.entries()]
    .map(([id, value]) => ({ label: serviceName.get(id) ?? '—', value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const bySource: Point[] = [...src.entries()].map(([label, value]) => ({ label, value }));
  const byStaff: Point[] = [...byStaffMap.entries()]
    .map(([id, value]) => ({ label: staffName.get(id) ?? '—', value }))
    .sort((a, b) => b.value - a.value);

  const newClients = newCount ?? 0;
  const returningClients = Math.max(0, customers.size - newClients);

  return {
    isEmpty: totalBookings === 0,
    totalBookings,
    revenue,
    noShowRate,
    avgTicket,
    revenueByDay,
    bookingsByDay,
    topServices,
    bySource,
    byStaff,
    newClients,
    returningClients,
  };
}
