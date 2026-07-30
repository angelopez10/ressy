import 'server-only';

/**
 * ============================================================================
 * Ressy — Lecturas del panel de Super Admin
 * ============================================================================
 * Todo lo de acá es CROSS-TENANT, así que cada función exige un `AdminActor`
 * (el que solo produce `requireAdmin()`). Sin actor no hay cliente elevado.
 *
 * De dónde sale cada cosa:
 *  - Dinero y estado (MRR, planes, negocios, pagos, alertas) → ESTA DB. Para
 *    plata, la fuente de verdad es la propia DB + Mercado Pago, nunca PostHog.
 *  - Comportamiento (embudos internos del onboarding, funnel de la booking
 *    page, cohortes) → PostHog, en la pantalla de Métricas (segunda pasada).
 *
 * El embudo de ACTIVACIÓN sí sale de la DB y es exacto: signups = businesses,
 * onboarding completado = is_published, primera reserva = tiene ≥1 booking.
 *
 * Los precios se pasan a las RPC desde `lib/plans/config.ts` (fuente de verdad
 * única): en SQL no hay ni un precio hardcodeado.
 * ============================================================================
 */

import { createAdminDb } from './db';
import { getUsdPerClp } from './env';
import type { AdminActor } from './guard';
import { planPriceTable } from './pricing';
import {
  rangeToDates as toDates,
  type BusinessState,
  type Health,
  type RangeKey,
  type SortKey,
} from './shared';

// Rango, estados y orden viven en `shared.ts` porque los necesita también el
// cliente (RangePicker, filtros). Se re-exportan para que los server components
// sigan importando todo desde un solo lugar.
export {
  RANGES,
  isRangeKey,
  rangeToDates,
  type RangeKey,
  type BusinessState,
  type Health,
  type SortKey,
} from './shared';

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface OverviewStats {
  mrr: { usd: number; clp: number; totalUsd: number; paying: number };
  businesses: { total: number; active: number; trialing: number; suspended: number };
  signups: { current: number; previous: number };
  funnel: { signups: number; onboarded: number; firstBooking: number };
  trialConversion: { cohort: number; paid: number };
  churn: { current: number; previous: number; base: number };
}

export async function getOverviewStats(actor: AdminActor, range: RangeKey): Promise<OverviewStats> {
  const db = createAdminDb(actor);
  const { from, to } = toDates(range);

  const { data, error } = await db.rpc('admin_overview_stats', {
    p_prices: planPriceTable() as never,
    p_usd_per_clp: getUsdPerClp(),
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) {
    console.error('[admin] admin_overview_stats falló', error?.message);
    return {
      mrr: { usd: 0, clp: 0, totalUsd: 0, paying: 0 },
      businesses: { total: 0, active: 0, trialing: 0, suspended: 0 },
      signups: { current: 0, previous: 0 },
      funnel: { signups: 0, onboarded: 0, firstBooking: 0 },
      trialConversion: { cohort: 0, paid: 0 },
      churn: { current: 0, previous: 0, base: 0 },
    };
  }

  const d = data as Record<string, Record<string, number>>;
  return {
    mrr: {
      usd: Number(d.mrr?.usd ?? 0),
      clp: Number(d.mrr?.clp ?? 0),
      totalUsd: Number(d.mrr?.total_usd ?? 0),
      paying: Number(d.mrr?.paying ?? 0),
    },
    businesses: {
      total: Number(d.businesses?.total ?? 0),
      active: Number(d.businesses?.active ?? 0),
      trialing: Number(d.businesses?.trialing ?? 0),
      suspended: Number(d.businesses?.suspended ?? 0),
    },
    signups: {
      current: Number(d.signups?.current ?? 0),
      previous: Number(d.signups?.previous ?? 0),
    },
    funnel: {
      signups: Number(d.funnel?.signups ?? 0),
      onboarded: Number(d.funnel?.onboarded ?? 0),
      firstBooking: Number(d.funnel?.first_booking ?? 0),
    },
    trialConversion: {
      cohort: Number(d.trial_conversion?.cohort ?? 0),
      paid: Number(d.trial_conversion?.paid ?? 0),
    },
    churn: {
      current: Number(d.churn?.current ?? 0),
      previous: Number(d.churn?.previous ?? 0),
      base: Number(d.churn?.base ?? 0),
    },
  };
}

export interface PlatformAlerts {
  failedPayments: number;
  failedNotifications: number;
  lastWebhookAt: string | null;
  trialsEnding: number;
  stalePendingPayments: number;
}

export async function getPlatformAlerts(actor: AdminActor): Promise<PlatformAlerts> {
  const db = createAdminDb(actor);
  const { data, error } = await db.rpc('admin_platform_alerts', {});
  if (error || !data) {
    console.error('[admin] admin_platform_alerts falló', error?.message);
    return {
      failedPayments: 0,
      failedNotifications: 0,
      lastWebhookAt: null,
      trialsEnding: 0,
      stalePendingPayments: 0,
    };
  }
  const d = data as Record<string, unknown>;
  return {
    failedPayments: Number(d.failed_payments ?? 0),
    failedNotifications: Number(d.failed_notifications ?? 0),
    lastWebhookAt: (d.last_webhook_at as string | null) ?? null,
    trialsEnding: Number(d.trials_ending ?? 0),
    stalePendingPayments: Number(d.stale_pending_payments ?? 0),
  };
}

export interface ActivityItem {
  kind: 'signup' | 'published' | 'subscription';
  businessId: string;
  businessName: string;
  at: string;
  meta: Record<string, unknown>;
}

export async function getRecentActivity(actor: AdminActor, limit = 8): Promise<ActivityItem[]> {
  const db = createAdminDb(actor);
  const { data, error } = await db.rpc('admin_recent_activity', { p_limit: limit });
  if (error || !data) {
    console.error('[admin] admin_recent_activity falló', error?.message);
    return [];
  }
  return (data as Record<string, unknown>[]).map((r) => ({
    kind: r.kind as ActivityItem['kind'],
    businessId: String(r.business_id ?? ''),
    businessName: String(r.business_name ?? '—'),
    at: String(r.at ?? ''),
    meta: (r.meta as Record<string, unknown>) ?? {},
  }));
}

export interface MrrPoint {
  day: string;
  totalUsd: number;
}

/**
 * Serie de MRR. Sale de `mrr_daily_snapshots`, que llena un cron diario: el MRR
 * histórico NO se puede reconstruir con exactitud desde `subscriptions` (no hay
 * registro de qué plan tenía cada negocio en cada fecha). Por eso el gráfico
 * arranca vacío y se llena desde que empezamos a medir.
 */
export async function getMrrSeries(actor: AdminActor, range: RangeKey): Promise<MrrPoint[]> {
  const db = createAdminDb(actor);
  const { from } = toDates(range);
  const { data, error } = await db
    .from('mrr_daily_snapshots')
    .select('day, mrr_total_usd_cents')
    .gte('day', from.toISOString().slice(0, 10))
    .order('day', { ascending: true });

  if (error) {
    console.error('[admin] serie de MRR falló', error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ day: r.day, totalUsd: r.mrr_total_usd_cents / 100 }));
}

// ---------------------------------------------------------------------------
// Negocios
// ---------------------------------------------------------------------------

export interface BusinessRow {
  id: string;
  slug: string;
  name: string;
  currency: string;
  timezone: string;
  tier: string;
  status: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  lastActivity: string;
  bookings: number;
  mrrAmount: number;
  mrrUsd: number;
  health: Health;
  state: BusinessState;
}

export interface BusinessFilters {
  search?: string;
  plan?: string;
  state?: string;
  currency?: string;
  health?: string;
  trialEnding?: boolean;
  sort?: SortKey;
  dir?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export interface BusinessPage {
  rows: BusinessRow[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export async function getBusinessesPage(
  actor: AdminActor,
  filters: BusinessFilters,
): Promise<BusinessPage> {
  const db = createAdminDb(actor);
  const perPage = Math.min(Math.max(filters.perPage ?? 25, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);

  const { data, error } = await db.rpc('admin_businesses_page', {
    p_prices: planPriceTable() as never,
    p_usd_per_clp: getUsdPerClp(),
    p_search: filters.search || null,
    p_plan: filters.plan || null,
    p_status: filters.state || null,
    p_currency: filters.currency || null,
    p_health: filters.health || null,
    p_trial_ending: filters.trialEnding ?? false,
    p_sort: filters.sort ?? 'mrr',
    p_dir: filters.dir ?? 'desc',
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });

  if (error || !data) {
    console.error('[admin] admin_businesses_page falló', error?.message);
    return { rows: [], total: 0, page, perPage, pages: 0 };
  }

  const rows: BusinessRow[] = data.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    currency: r.currency,
    timezone: r.timezone,
    tier: r.tier,
    status: r.status,
    isTrial: r.is_trial,
    trialEndsAt: r.trial_ends_at,
    suspendedAt: r.suspended_at,
    isPublished: r.is_published,
    createdAt: r.created_at,
    lastActivity: r.last_activity,
    bookings: Number(r.bookings_count),
    mrrAmount: Number(r.mrr_amount),
    mrrUsd: Number(r.mrr_usd),
    health: r.health as Health,
    state: r.state as BusinessState,
  }));

  // `total_count` viene como window function: mismo valor en todas las filas.
  const total = data.length > 0 ? Number(data[0]!.total_count) : 0;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

// ---------------------------------------------------------------------------
// Ficha de negocio
// ---------------------------------------------------------------------------

export interface BusinessDetail {
  business: {
    id: string;
    slug: string;
    name: string;
    category: string | null;
    timezone: string;
    currency: string;
    bookingLocale: string;
    isPublished: boolean;
    suspendedAt: string | null;
    suspendedReason: string | null;
    createdAt: string;
  };
  subscription: {
    tier: string;
    status: string;
    isTrial: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    billingProvider: string | null;
  } | null;
  counts: {
    staff: number;
    services: number;
    members: number;
    bookings: number;
    noShow: number;
    completed: number;
  };
  weekly: { week: string; count: number }[];
  payments: {
    id: string;
    kind: string;
    amount: number;
    currency: string;
    provider: string;
    status: string;
    createdAt: string;
  }[];
  milestones: {
    createdAt: string | null;
    firstBookingAt: string | null;
    lastBookingAt: string | null;
    mpConnectedAt: string | null;
  };
  ops: { failedNotifications: number };
}

export async function getBusinessDetail(
  actor: AdminActor,
  businessId: string,
): Promise<BusinessDetail | null> {
  const db = createAdminDb(actor);
  const { data, error } = await db.rpc('admin_business_detail', { p_business_id: businessId });
  if (error || !data) {
    console.error('[admin] admin_business_detail falló', {
      business_id: businessId,
      error: error?.message,
    });
    return null;
  }

  const d = data as Record<string, unknown>;
  const b = d.business as Record<string, unknown> | null;
  if (!b) return null;
  const s = d.subscription as Record<string, unknown> | null;
  const counts = (d.counts ?? {}) as Record<string, number>;
  const milestones = (d.milestones ?? {}) as Record<string, string | null>;
  const ops = (d.ops ?? {}) as Record<string, number>;

  return {
    business: {
      id: String(b.id),
      slug: String(b.slug),
      name: String(b.name),
      category: (b.category as string | null) ?? null,
      timezone: String(b.timezone),
      currency: String(b.currency),
      bookingLocale: String(b.booking_locale ?? 'es'),
      isPublished: Boolean(b.is_published),
      suspendedAt: (b.suspended_at as string | null) ?? null,
      suspendedReason: (b.suspended_reason as string | null) ?? null,
      createdAt: String(b.created_at),
    },
    subscription: s
      ? {
          tier: String(s.tier),
          status: String(s.status),
          isTrial: Boolean(s.is_trial),
          trialEndsAt: (s.trial_ends_at as string | null) ?? null,
          currentPeriodEnd: (s.current_period_end as string | null) ?? null,
          cancelAtPeriodEnd: Boolean(s.cancel_at_period_end),
          billingProvider: (s.billing_provider as string | null) ?? null,
        }
      : null,
    counts: {
      staff: Number(counts.staff ?? 0),
      services: Number(counts.services ?? 0),
      members: Number(counts.members ?? 0),
      bookings: Number(counts.bookings ?? 0),
      noShow: Number(counts.no_show ?? 0),
      completed: Number(counts.completed ?? 0),
    },
    weekly: ((d.weekly ?? []) as { week: string; count: number }[]).map((w) => ({
      week: w.week,
      count: Number(w.count),
    })),
    payments: ((d.payments ?? []) as Record<string, unknown>[]).map((p) => ({
      id: String(p.id),
      kind: String(p.kind),
      amount: Number(p.amount),
      currency: String(p.currency),
      provider: String(p.provider),
      status: String(p.status),
      createdAt: String(p.created_at),
    })),
    milestones: {
      createdAt: milestones.created_at ?? null,
      firstBookingAt: milestones.first_booking_at ?? null,
      lastBookingAt: milestones.last_booking_at ?? null,
      mpConnectedAt: milestones.mp_connected_at ?? null,
    },
    ops: { failedNotifications: Number(ops.failed_notifications ?? 0) },
  };
}

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------

export interface AuditRow {
  id: string;
  adminEmail: string;
  action: string;
  businessId: string | null;
  businessName: string | null;
  payload: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

export async function getAuditLog(
  actor: AdminActor,
  opts: { businessId?: string; page?: number; perPage?: number } = {},
): Promise<{ rows: AuditRow[]; total: number; page: number; perPage: number }> {
  const db = createAdminDb(actor);
  const perPage = Math.min(Math.max(opts.perPage ?? 50, 1), 200);
  const page = Math.max(opts.page ?? 1, 1);

  let query = db
    .from('admin_audit_log')
    .select('id, admin_email, action, business_id, business_name, payload, ip, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (opts.businessId) query = query.eq('business_id', opts.businessId);

  const { data, count, error } = await query;
  if (error) {
    console.error('[admin] lectura del audit log falló', error.message);
    return { rows: [], total: 0, page, perPage };
  }

  return {
    rows: (data ?? []).map((r) => ({
      id: r.id,
      adminEmail: r.admin_email,
      action: r.action,
      businessId: r.business_id,
      businessName: r.business_name,
      payload: (r.payload as Record<string, unknown>) ?? {},
      ip: r.ip,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
    page,
    perPage,
  };
}
