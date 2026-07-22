import 'server-only';

/**
 * Estado del plan de un negocio en la capa de datos: suscripción, trial y uso
 * vs límites. Lo consumen el dashboard (banners, tab de plan) y el gating. Los
 * LÍMITES salen de lib/plans/config.ts; el USO sale de la DB (RPCs y contadores
 * que ya son la autoridad del gating). No hay números hardcodeados aquí.
 */

import { DateTime } from 'luxon';
import type { ServiceClient } from '@/lib/db/service';
import type { createClient } from '@/lib/db/server';
import { getLimit, getPlan, TRIAL_DAYS, type PlanId } from './config';

/** Acepta tanto el cliente autenticado (RLS) como el service client. */
type AnyDb = ServiceClient | Awaited<ReturnType<typeof createClient>>;

export interface TrialInfo {
  isTrial: boolean;
  /** ISO UTC. */
  trialEndsAt: string | null;
  /** Días enteros que faltan (redondeo hacia arriba). 0 si ya venció o no hay trial. */
  daysLeft: number;
  /** true en los últimos días del trial (aviso más notorio). */
  endingSoon: boolean;
}

export interface UsageMetric {
  used: number;
  /** `Infinity` = ilimitado. */
  limit: number;
  /** true si `used >= limit` (nunca para ilimitado). */
  atLimit: boolean;
}

export interface PlanUsage {
  bookings: UsageMetric;
  staff: UsageMetric;
  whatsapp: UsageMetric;
}

/**
 * Clave del mes calendario (`yyyy-MM`) de un instante UTC, EN LA TZ DEL NEGOCIO.
 * Espejo en JS de la regla del contador de la DB (`date_trunc('month', created_at
 * at time zone tz)`): dos reservas caen en el mismo ciclo sii comparten esta
 * clave. Así el tope "se resetea el día 1" en la tz del negocio, con DST incluido
 * (el offset cambia pero el mes local no). Documenta y testea el contrato.
 */
export function bookingPeriodKey(instantUtcIso: string, tz: string): string {
  return DateTime.fromISO(instantUtcIso, { zone: 'utc' }).setZone(tz).toFormat('yyyy-MM');
}

/** Días restantes de un trial a partir de su fin (ISO UTC). */
export function trialDaysLeft(trialEndsAt: string | null, now = new Date()): number {
  if (!trialEndsAt) return 0;
  const end = DateTime.fromISO(trialEndsAt, { zone: 'utc' });
  const diff = end.diff(DateTime.fromJSDate(now, { zone: 'utc' }), 'days').days;
  return diff <= 0 ? 0 : Math.ceil(diff);
}

export function toTrialInfo(
  sub: { is_trial: boolean; trial_ends_at: string | null },
  now = new Date(),
): TrialInfo {
  const daysLeft = sub.is_trial ? trialDaysLeft(sub.trial_ends_at, now) : 0;
  return {
    isTrial: sub.is_trial,
    trialEndsAt: sub.trial_ends_at,
    daysLeft,
    // "Más notorio en los últimos 3 días" (TRIAL_NUDGE_DAYS en config; aquí <=3).
    endingSoon: sub.is_trial && daysLeft > 0 && daysLeft <= 3,
  };
}

function metric(used: number, limit: number): UsageMetric {
  return { used, limit, atLimit: used >= limit };
}

/**
 * Uso del mes vs límites del plan. `bookings` usa la RPC `bookings_used_this_month`
 * (misma cuenta que el guard de la DB); `staff` cuenta staff activo; `whatsapp`
 * lee `notification_usage` del período UTC actual.
 */
export async function getPlanUsage(db: AnyDb, businessId: string, tier: PlanId): Promise<PlanUsage> {
  const period = DateTime.utc().toFormat('yyyy-MM');

  const [{ data: bookingsUsed }, { count: staffUsed }, { data: waRows }] = await Promise.all([
    db.rpc('bookings_used_this_month', { p_business_id: businessId }),
    db
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true),
    db
      .from('notification_usage')
      .select('count')
      .eq('business_id', businessId)
      .eq('period', period)
      .eq('channel', 'whatsapp'),
  ]);

  const whatsappUsed = (waRows ?? []).reduce((sum, r) => sum + (r.count ?? 0), 0);

  return {
    bookings: metric(bookingsUsed ?? 0, getLimit(tier, 'bookingsPerMonth')),
    staff: metric(staffUsed ?? 0, getLimit(tier, 'staff')),
    whatsapp: metric(whatsappUsed, getPlan(tier).limits.whatsappPerMonth),
  };
}

export { TRIAL_DAYS };
