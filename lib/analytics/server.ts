import 'server-only';

/**
 * ============================================================================
 * Ressy — Capa de tracking SERVER-SIDE (posthog-node)
 * ============================================================================
 * Los eventos que son FUENTE DE VERDAD (reservas, pagos, webhooks, trial) se
 * trackean acá, no en el cliente: no son manipulables y no dependen de que el
 * browser esté abierto. Mismo catálogo tipado (`events.ts`) y mismo filtro
 * anti-PII (`sanitize.ts`) que el client.
 *
 * - distinctId = `business_id`: los eventos de servidor se agrupan por negocio,
 *   nunca por una identidad personal.
 * - Best-effort: `trackServer` NUNCA lanza ni bloquea el flujo de negocio. Una
 *   reserva no falla porque PostHog esté caído.
 * - dev/prod: se separan por el VALOR de la key en cada ambiente (proyecto
 *   PostHog por ambiente). Sin key o en test ⇒ no-op.
 * ============================================================================
 */

import { PostHog } from 'posthog-node';
import type { ServiceClient } from '@/lib/db/service';
import type { createClient } from '@/lib/db/server';
import { getPlan, isPlanId, type PlanId } from '@/lib/plans/config';
import type { AnalyticsEvent, AnalyticsLocale, CommonProps, TrackPayload } from './events';
import { sanitize } from './sanitize';

/** Cualquiera de los dos clientes Supabase (RLS o service role). */
type AnyDb = ServiceClient | Awaited<ReturnType<typeof createClient>>;

let client: PostHog | null = null;
let initTried = false;

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test';
}

/** Key server-side: usa la propia si existe, si no la pública (mismo proyecto). */
function key(): string | undefined {
  return process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;
}

function host(): string {
  return process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
}

function getClient(): PostHog | null {
  if (client || initTried) return client;
  initTried = true;
  if (isTestEnv() || !key()) return null;
  // flushAt:1 + flushInterval:0 ⇒ envío inmediato, apto para serverless (el
  // proceso puede congelarse tras responder; no acumulamos batch sin enviar).
  client = new PostHog(key()!, { host: host(), flushAt: 1, flushInterval: 0 });
  return client;
}

/**
 * Envía un evento tipado del lado servidor. `businessId` es el distinctId + el
 * group `business`. No-op si falta key o estamos en test. Nunca lanza.
 */
export async function trackServer<E extends AnalyticsEvent>(
  event: E,
  businessId: string,
  props?: TrackPayload<E>,
): Promise<void> {
  try {
    const clean = sanitize({ ...props, business_id: businessId });
    const ph = getClient();
    if (!ph) {
      if (!isTestEnv()) {
        console.debug('[analytics:noop]', event, clean);
      }
      return;
    }
    ph.capture({ distinctId: businessId, event, properties: clean, groups: { business: businessId } });
    await ph.flush();
  } catch {
    /* best-effort: analytics jamás rompe el flujo de negocio */
  }
}

// ---------------------------------------------------------------------------
// Enriquecimiento de propiedades comunes
// ---------------------------------------------------------------------------

/** Moneda → país ISO, solo para los casos inequívocos. El resto queda sin país. */
const CURRENCY_COUNTRY: Record<string, string> = {
  clp: 'CL',
  mxn: 'MX',
  brl: 'BR',
  cop: 'CO',
  ars: 'AR',
  pen: 'PE',
};

/**
 * Carga las props comunes (`plan`, `locale`, `country`) de un negocio en una
 * sola consulta. Todas no-PII. Se usa en los call sites de servidor para
 * enriquecer sin repetir queries. `business_id` lo agrega `trackServer`.
 */
export async function commonPropsFor(db: AnyDb, businessId: string): Promise<CommonProps> {
  const props: CommonProps = {};
  try {
    const [{ data: biz }, { data: sub }] = await Promise.all([
      db.from('businesses').select('currency, booking_locale').eq('id', businessId).maybeSingle(),
      db.from('subscriptions').select('tier').eq('business_id', businessId).maybeSingle(),
    ]);
    if (biz) {
      props.locale = biz.booking_locale === 'en' ? 'en' : 'es';
      const country = CURRENCY_COUNTRY[String(biz.currency).toLowerCase()];
      if (country) props.country = country;
    }
    if (sub && isPlanId(sub.tier)) props.plan = sub.tier as PlanId;
  } catch {
    /* enriquecimiento best-effort: el evento sale igual con lo que haya */
  }
  return props;
}

/** Coincide con el `AnalyticsLocale` a partir de un `booking_locale` crudo. */
export function toAnalyticsLocale(raw: string | null | undefined): AnalyticsLocale {
  return raw === 'en' ? 'en' : 'es';
}

/** Fuerza el flush pendiente (útil en tests / cierre de procesos). */
export async function flushAnalytics(): Promise<void> {
  try {
    await client?.flush();
  } catch {
    /* best-effort */
  }
}

/** Helper de plan para call sites que ya tienen el tier a mano. */
export function planName(tier: string | null | undefined): PlanId {
  return getPlan(tier).id;
}
