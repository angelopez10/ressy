import 'server-only';

/**
 * Lecturas del mini-CRM. PII (email/teléfono/notas) — RLS la acota al tenant y
 * nunca se loguea (CLAUDE.md §9). La agregación por cliente se hace en memoria:
 * para el volumen de un negocio de servicios es suficiente.
 */

import { createClient } from '@/lib/db/server';
import type { Enums } from '@/lib/db/types';

export interface ClientRow {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  visits: number;
  noShows: number;
  spent: number;
  lastVisitIso: string | null;
  totalBookings: number;
  isRisk: boolean;
}

export interface ClientHistoryItem {
  id: string;
  startsAtIso: string;
  status: Enums<'booking_status'>;
  serviceName: string;
  priceAmount: number;
}

export interface ClientDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  createdAtIso: string;
  visits: number;
  noShows: number;
  spent: number;
  history: ClientHistoryItem[];
}

type BookingAgg = { customer_id: string; status: Enums<'booking_status'>; price_amount: number; starts_at: string };

function aggregate(rows: BookingAgg[]) {
  const map = new Map<string, { visits: number; noShows: number; spent: number; last: string | null; total: number }>();
  for (const b of rows) {
    const a = map.get(b.customer_id) ?? { visits: 0, noShows: 0, spent: 0, last: null, total: 0 };
    a.total += 1;
    if (b.status === 'completed') {
      a.visits += 1;
      a.spent += b.price_amount;
    } else if (b.status === 'no_show') {
      a.noShows += 1;
    }
    if (!a.last || b.starts_at > a.last) a.last = b.starts_at;
    map.set(b.customer_id, a);
  }
  return map;
}

export async function getClients(businessId: string): Promise<ClientRow[]> {
  const db = await createClient();
  const [{ data: customers }, { data: bookings }] = await Promise.all([
    db
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    db.from('bookings').select('customer_id, status, price_amount, starts_at').eq('business_id', businessId),
  ]);

  const agg = aggregate((bookings as BookingAgg[] | null) ?? []);

  return (customers ?? []).map((c) => {
    const a = agg.get(c.id);
    return {
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      visits: a?.visits ?? 0,
      noShows: a?.noShows ?? 0,
      spent: a?.spent ?? 0,
      lastVisitIso: a?.last ?? null,
      totalBookings: a?.total ?? 0,
      isRisk: (a?.noShows ?? 0) >= 2,
    };
  });
}

export async function getClientDetail(businessId: string, customerId: string): Promise<ClientDetail | null> {
  const db = await createClient();
  const { data: c } = await db
    .from('customers')
    .select('id, full_name, email, phone, notes, tags, created_at')
    .eq('business_id', businessId)
    .eq('id', customerId)
    .maybeSingle();
  if (!c) return null;

  const { data: bookings } = await db
    .from('bookings')
    .select('id, starts_at, status, price_amount, services(name)')
    .eq('customer_id', customerId)
    .order('starts_at', { ascending: false });

  const history: ClientHistoryItem[] = (
    (bookings as unknown as {
      id: string;
      starts_at: string;
      status: Enums<'booking_status'>;
      price_amount: number;
      services: { name: string } | null;
    }[]) ?? []
  ).map((b) => ({
    id: b.id,
    startsAtIso: b.starts_at,
    status: b.status,
    serviceName: b.services?.name ?? '—',
    priceAmount: b.price_amount,
  }));

  const visits = history.filter((h) => h.status === 'completed').length;
  const noShows = history.filter((h) => h.status === 'no_show').length;
  const spent = history.filter((h) => h.status === 'completed').reduce((s, h) => s + h.priceAmount, 0);

  return {
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    tags: c.tags,
    createdAtIso: c.created_at,
    visits,
    noShows,
    spent,
    history,
  };
}
