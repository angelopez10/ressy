/**
 * ============================================================================
 * Ressy — Capa de tracking CLIENT-SIDE (posthog-js)
 * ============================================================================
 * Único punto de contacto con posthog-js en todo el front. Nadie llama
 * `posthog.capture` directo: se usa `track(event, props)`, tipado contra el
 * catálogo (`events.ts`) y saneado por `sanitize.ts`.
 *
 * PRIVACIDAD (CLAUDE.md §9):
 *   - Init HARDCODEADO seguro: session recording DESACTIVADO, autocapture OFF,
 *     sin captura de contenido de formularios. La misma config vale para el
 *     dashboard, el marketing y la BOOKING PAGE (donde hay datos de clientes en
 *     pantalla) — por eso es seguro incluso sin `PostHogProvider`.
 *   - Consentimiento: si el visitante no consiente, `track` es no-op.
 *   - Sin key (ej. dev local) o en test ⇒ no-op con `console.debug`, así el
 *     desarrollo no ensucia ningún proyecto. dev/prod se separan por el VALOR de
 *     `NEXT_PUBLIC_POSTHOG_KEY` en cada ambiente de Vercel (proyecto por ambiente).
 * ============================================================================
 */

import type { PostHog } from 'posthog-js';
import type { AnalyticsEvent, AnalyticsLocale, TrackPayload } from './events';
import type { PlanId } from '@/lib/plans/config';
import { sanitize } from './sanitize';
import { hasAnalyticsConsent } from './consent';

let client: PostHog | null = null;
let initTried = false;

function isTestEnv(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
}

function key(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;
}

function host(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
}

/**
 * Inicializa posthog-js UNA sola vez, con la config segura. Idempotente y
 * perezoso: se dispara en el primer `track`/`identify`. Devuelve `null` si no
 * hay key o estamos en test (⇒ los callers hacen no-op).
 */
function getClient(): PostHog | null {
  if (client || initTried) return client;
  initTried = true;
  if (typeof window === 'undefined' || isTestEnv() || !key()) return null;

  // Import perezoso: el SDK solo entra al bundle cuando de verdad se trackea.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const posthog = require('posthog-js').default as PostHog;
  posthog.init(key()!, {
    api_host: host(),
    // Nada de captura implícita: SOLO los eventos del catálogo.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    // Session recording FUERA en todas las superficies (la booking page muestra
    // datos de clientes). Si algún día se activa, va con enmascarado total.
    disable_session_recording: true,
    // Enmascarado por si el recording se activara por config remota.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    // No capturar valores de inputs bajo ninguna circunstancia.
    mask_all_text: false, // no aplica sin recording; los eventos son manuales
    persistence: 'localStorage+cookie',
    // Respeta el opt-out; el gate fino lo hace `hasAnalyticsConsent`.
    respect_dnt: true,
  });
  client = posthog;
  return client;
}

/**
 * Envía un evento tipado. No-op silencioso si falta consentimiento, key o SDK.
 * Nunca lanza: analytics jamás rompe la UI.
 */
export function track<E extends AnalyticsEvent>(event: E, props?: TrackPayload<E>): void {
  try {
    if (!hasAnalyticsConsent()) return;
    const ph = getClient();
    const clean = sanitize(props as Record<string, unknown> | undefined);
    if (!ph) {
      if (!isTestEnv()) {
        console.debug('[analytics:noop]', event, clean);
      }
      return;
    }
    ph.capture(event, clean);
  } catch {
    /* best-effort: analytics nunca rompe el flujo */
  }
}

/**
 * Asocia la sesión anónima con el USER id (no email) e imprime el negocio como
 * "group" para análisis por cuenta. Se llama una vez desde el provider del
 * dashboard. En superficies anónimas (marketing/booking) NO se llama.
 */
export function identifyBusiness(
  userId: string,
  business: { businessId: string; plan?: PlanId; locale?: AnalyticsLocale },
): void {
  try {
    if (!hasAnalyticsConsent()) return;
    const ph = getClient();
    if (!ph) return;
    ph.identify(userId); // sin props ⇒ sin PII asociada al perfil
    ph.group('business', business.businessId, sanitize({ plan: business.plan }));
  } catch {
    /* best-effort */
  }
}

/**
 * Asocia los eventos al GROUP `business` SIN identificar a una persona. Útil en
 * superficies donde hay negocio pero no queremos un perfil personal (ej. la
 * pantalla final del onboarding). Así los funnels por negocio unen estos eventos
 * client con los server (que ya usan el mismo group).
 */
export function setBusinessGroup(businessId: string, plan?: PlanId): void {
  try {
    if (!hasAnalyticsConsent()) return;
    const ph = getClient();
    if (!ph) return;
    ph.group('business', businessId, sanitize({ plan }));
  } catch {
    /* best-effort */
  }
}

/** Cierra sesión de analytics (al hacer logout). Evita mezclar identidades. */
export function resetAnalytics(): void {
  try {
    client?.reset();
  } catch {
    /* best-effort */
  }
}
