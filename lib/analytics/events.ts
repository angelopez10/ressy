/**
 * ============================================================================
 * Ressy — Catálogo ÚNICO y TIPADO de eventos de producto (PostHog)
 * ============================================================================
 * Isomórfico (sin SDK): lo consumen tanto la capa client (`track.ts`) como la
 * server (`server.ts`). NINGÚN `posthog.capture(...)` suelto en el código —
 * todo pasa por `track`/`trackServer`, que solo aceptan nombres y props de este
 * catálogo. Así los nombres son consistentes, las props no se escriben distinto
 * en cada lugar, y el filtro anti-PII (`sanitize.ts`) tiene una superficie
 * cerrada que auditar.
 *
 * REGLA DE ORO (CLAUDE.md §9 · privacidad): NINGUNA propiedad lleva PII —
 * ni emails, ni teléfonos, ni nombres de clientes finales, ni notas del CRM.
 * Solo identificadores (`business_id`), enums, booleanos y números. Si un evento
 * necesitara un dato personal para responder su pregunta, la pregunta está mal
 * planteada. El allowlist de `sanitize.ts` es la red final que lo garantiza.
 * ============================================================================
 */

import type { PlanId, BillingCycle } from '@/lib/plans/config';

/** Idioma de la superficie (dashboard / booking page). */
export type AnalyticsLocale = 'es' | 'en';

/**
 * Propiedades comunes, adjuntas a CADA evento cuando aplican. El negocio se
 * identifica SIEMPRE por `business_id`, nunca por su email (CLAUDE.md §9). Todos
 * son no-PII: id opaco, enum de plan, código de idioma/país.
 */
export interface CommonProps {
  business_id?: string;
  plan?: PlanId;
  locale?: AnalyticsLocale;
  /** Código ISO de país del negocio (derivado de la moneda; nunca del visitante). */
  country?: string;
}

/** Vacío tipado: eventos sin props propias (solo comunes). */
type NoProps = Record<never, never>;

/**
 * Motivo NORMALIZADO de un recordatorio fallido. Enum cerrado a propósito: el
 * error crudo del proveedor (SMTP/Twilio) puede contener el email/teléfono del
 * destinatario ⇒ jamás se envía tal cual. Se mapea a una de estas categorías.
 */
export type ReminderFailReason = 'delivery_error' | 'not_configured' | 'no_channel';

/**
 * El mapa evento → forma de sus props. La ÚNICA fuente de verdad de qué eventos
 * existen y qué llevan. Agregar un evento = agregar una línea aquí (+ su key en
 * el allowlist de `sanitize.ts` si trae una propiedad nueva).
 */
export interface AnalyticsEventMap {
  // --- Embudo del negocio (SaaS) -------------------------------------------
  business_signed_up: { method: 'email' | 'google' };
  onboarding_step_completed: { step: 1 | 2 | 3 | 4 | 5 };
  onboarding_completed: NoProps;
  booking_link_shared: { channel: 'instagram' | 'whatsapp' | 'copy' | 'qr' };

  // --- Activación ----------------------------------------------------------
  /** La PRIMERA reserva real de un negocio. El evento de activación por excelencia. */
  first_booking_received: NoProps;
  booking_created: { origin: 'link' | 'qr' | 'instagram' | 'manual' | 'other'; with_deposit: boolean };
  booking_completed: NoProps;
  booking_no_show: NoProps;
  booking_cancelled: { by: 'client' | 'business' };
  booking_rescheduled: { by: 'client' | 'business' };

  // --- Embudo de la booking page (client-side) -----------------------------
  booking_page_viewed: NoProps;
  service_selected: NoProps;
  slot_selected: NoProps;
  booking_form_started: NoProps;
  booking_confirmed: { with_deposit: boolean };

  // --- Notificaciones ------------------------------------------------------
  reminder_sent: { channel: 'email' | 'whatsapp' | 'sms'; kind: '24h' | '2h' | 'other' };
  reminder_failed: { channel: 'email' | 'whatsapp' | 'sms'; reason: ReminderFailReason };

  // --- Monetización --------------------------------------------------------
  trial_started: NoProps;
  trial_ending_soon: NoProps;
  trial_ended: NoProps;
  subscription_started: { plan: PlanId; cycle: BillingCycle };
  subscription_upgraded: { previous_plan: PlanId; new_plan: PlanId };
  subscription_downgraded: { previous_plan: PlanId; new_plan: PlanId };
  subscription_cancelled: { plan: PlanId };
  payment_failed: NoProps;
  plan_limit_reached: { limit: 'bookings' | 'staff' | 'whatsapp' | 'services' };
  upgrade_cta_clicked: { from: string };
}

/** Nombre de evento válido (una key del mapa). */
export type AnalyticsEvent = keyof AnalyticsEventMap;

/** Props propias de un evento (sin las comunes). */
export type EventProps<E extends AnalyticsEvent> = AnalyticsEventMap[E];

/**
 * Payload completo que se envía: props del evento + comunes. Si el evento no
 * tiene props propias, basta con las comunes (todas opcionales).
 */
export type TrackPayload<E extends AnalyticsEvent> = EventProps<E> & CommonProps;

/**
 * Clasificación server/client — DOCUMENTAL y usada por los tests para verificar
 * que cada evento se dispara del lado correcto. Los eventos de servidor son la
 * fuente de verdad (no manipulables por el cliente); los de UI miden intención.
 */
export const SERVER_EVENTS = [
  'business_signed_up',
  'onboarding_step_completed',
  'onboarding_completed',
  'first_booking_received',
  'booking_created',
  'booking_completed',
  'booking_no_show',
  'booking_cancelled',
  'booking_rescheduled',
  'reminder_sent',
  'reminder_failed',
  'trial_started',
  'trial_ending_soon',
  'trial_ended',
  'subscription_started',
  'subscription_upgraded',
  'subscription_downgraded',
  'subscription_cancelled',
  'payment_failed',
  'plan_limit_reached',
] as const satisfies readonly AnalyticsEvent[];

export const CLIENT_EVENTS = [
  'booking_link_shared',
  'booking_page_viewed',
  'service_selected',
  'slot_selected',
  'booking_form_started',
  'booking_confirmed',
  'upgrade_cta_clicked',
] as const satisfies readonly AnalyticsEvent[];
