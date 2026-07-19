'use server';

/** Export CSV de reservas — función del plan Business (CLAUDE.md §1 · tiers). */

import { createClient } from '@/lib/db/server';
import { getDashboardContext } from './context';
import { rangeToUtc, type ReportRange } from './reports';
import type { Enums } from '@/lib/db/types';

export type CsvResult = { ok: true; csv: string; filename: string } | { ok: false; error: string };

function esc(v: string | number | null): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportBookingsCsv(range: ReportRange): Promise<CsvResult> {
  const ctx = await getDashboardContext();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  if (ctx.tier !== 'business') return { ok: false, error: 'planFeature' };

  const { fromIso, toIso } = rangeToUtc(range, ctx.business.timezone);
  const db = await createClient();
  const { data } = await db
    .from('bookings')
    .select('starts_at, status, source, price_amount, currency, services(name), staff_members(name), customers(full_name, email, phone)')
    .eq('business_id', ctx.business.id)
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso)
    .order('starts_at', { ascending: true });

  type Row = {
    starts_at: string;
    status: Enums<'booking_status'>;
    source: Enums<'booking_source'>;
    price_amount: number;
    currency: string;
    services: { name: string } | null;
    staff_members: { name: string } | null;
    customers: { full_name: string; email: string | null; phone: string | null } | null;
  };

  const header = ['datetime_utc', 'status', 'source', 'service', 'professional', 'client', 'email', 'phone', 'amount', 'currency'];
  const lines = [header.join(',')];
  for (const r of (data as unknown as Row[] | null) ?? []) {
    lines.push(
      [
        r.starts_at,
        r.status,
        r.source,
        r.services?.name ?? '',
        r.staff_members?.name ?? '',
        r.customers?.full_name ?? '',
        r.customers?.email ?? '',
        r.customers?.phone ?? '',
        r.price_amount,
        r.currency,
      ]
        .map(esc)
        .join(','),
    );
  }

  return { ok: true, csv: lines.join('\n'), filename: `ressy-bookings-${range}.csv` };
}
