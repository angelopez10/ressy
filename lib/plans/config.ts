/**
 * ============================================================================
 * Ressy — Fuente de verdad ÚNICA de planes (CLAUDE.md §1 · monetización)
 * ============================================================================
 * Todo lo que dependa de planes —landing, dashboard, gating, notificaciones,
 * jobs de trial— lee de aquí. NINGÚN precio ni límite hardcodeado fuera de este
 * archivo. Cambiar la oferta = editar solo este módulo (+ el copy i18n).
 *
 * - Los `id` son ESTABLES (`free`/`solo`/`team`/`studio`) y coinciden con el
 *   enum `subscription_tier` en Postgres. Los nombres visibles van por i18n.
 * - Precios en unidad MAYOR para display (USD dólares, CLP pesos). El cobro real
 *   (Stripe) es de la sesión siguiente; aquí solo se modela.
 * - Cliente-seguro a propósito (sin `server-only`): lo consumen server components
 *   y componentes `"use client"` de la landing/dashboard.
 *
 * Anual = 10 meses (2 gratis), como en la tabla aprobada.
 * ============================================================================
 */

export type PlanId = 'free' | 'solo' | 'team' | 'studio';

export type Currency = 'usd' | 'clp';
export type BillingCycle = 'monthly' | 'yearly';

/** ∞ en la tabla → sentinel numérico. Comparable con `used >= limit` (siempre false). */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export interface PlanPricing {
  /** Unidad mayor (dólares). */
  usd: { monthly: number; yearly: number };
  /** Unidad mayor (pesos chilenos, sin decimales). */
  clp: { monthly: number; yearly: number };
}

export interface PlanLimits {
  /** Profesionales incluidos en el plan (asientos base). */
  staff: number;
  /** USD por asiento extra sobre el base (solo Studio). `null` = no admite extras. */
  extraSeatUsd: number | null;
  /** CLP por asiento extra sobre el base (solo Studio). `null` = no admite extras. */
  extraSeatClp: number | null;
  /** Servicios activos. `UNLIMITED` = ∞. */
  services: number;
  /** Reservas nuevas por mes calendario (tz del negocio). `UNLIMITED` = ∞. */
  bookingsPerMonth: number;
  /** Mensajes de WhatsApp por mes. 0 = no disponible (cae a email). */
  whatsappPerMonth: number;
}

export type CrmLevel = 'basic' | 'full';
export type ReportsLevel = 'none' | 'basic' | 'advanced' | 'advanced_csv';
export type StaffPermissionsLevel = 'none' | 'basic' | 'granular';
export type SupportLevel = 'community' | 'email' | 'email_priority' | 'chat_priority';

export interface PlanFeatures {
  /** Marca "Powered by Ressy" en la booking page. En Free es no removible. */
  poweredByRessy: boolean;
  /** Dominio propio (solo Studio). */
  customDomain: boolean;
  /** Recordatorios por email — en todos los planes. */
  emailReminders: boolean;
  /** Recordatorios por WhatsApp (deriva de `limits.whatsappPerMonth > 0`). */
  whatsapp: boolean;
  /** Cobro de anticipos. */
  deposits: boolean;
  /** Política y cobro de no-show. */
  noShowPolicy: boolean;
  /** Google Calendar 2 vías. */
  googleCalendar: boolean;
  crm: CrmLevel;
  reports: ReportsLevel;
  staffPermissions: StaffPermissionsLevel;
  /** Multi-sucursal (solo Studio). */
  multiLocation: boolean;
  /** API / webhooks (solo Studio). */
  apiWebhooks: boolean;
  support: SupportLevel;
  /**
   * Fee de plataforma sobre pagos online, en %. Solo MODELADO — el cobro real
   * lo aplica la sesión de pagos. 1% en Free/Solo, 0% en Team/Studio.
   */
  platformFeePct: number;
}

export interface Plan {
  id: PlanId;
  /** Orden en las cards de pricing (0 = primero). */
  order: number;
  /** Card destacada "Más popular". Solo Team. */
  popular: boolean;
  pricing: PlanPricing;
  limits: PlanLimits;
  features: PlanFeatures;
}

/** Trial: todo negocio nuevo parte en Team por 14 días, sin tarjeta. */
export const TRIAL_PLAN: PlanId = 'team';
export const TRIAL_DAYS = 14;
/** Días antes del término en que el aviso se vuelve más notorio + emails. */
export const TRIAL_NUDGE_DAYS = 3;
export const TRIAL_EMAIL_DAYS = [11, 14] as const;

/** Umbrales de aviso in-app del tope de reservas del Free (felicitación + CTA). */
export const BOOKING_NUDGE_THRESHOLDS = [18, 23, 25] as const;

// ---------------------------------------------------------------------------
// Definición de los planes
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    order: 0,
    popular: false,
    pricing: { usd: { monthly: 0, yearly: 0 }, clp: { monthly: 0, yearly: 0 } },
    limits: { staff: 1, extraSeatUsd: null, extraSeatClp: null, services: 3, bookingsPerMonth: 25, whatsappPerMonth: 0 },
    features: {
      poweredByRessy: true,
      customDomain: false,
      emailReminders: true,
      whatsapp: false,
      deposits: false,
      noShowPolicy: false,
      googleCalendar: false,
      crm: 'basic',
      reports: 'none',
      staffPermissions: 'none',
      multiLocation: false,
      apiWebhooks: false,
      support: 'community',
      platformFeePct: 1,
    },
  },
  solo: {
    id: 'solo',
    order: 1,
    popular: false,
    pricing: { usd: { monthly: 9, yearly: 90 }, clp: { monthly: 9900, yearly: 99000 } },
    limits: { staff: 1, extraSeatUsd: null, extraSeatClp: null, services: UNLIMITED, bookingsPerMonth: UNLIMITED, whatsappPerMonth: 100 },
    features: {
      poweredByRessy: false,
      customDomain: false,
      emailReminders: true,
      whatsapp: true,
      deposits: true,
      noShowPolicy: false,
      googleCalendar: true,
      crm: 'full',
      reports: 'basic',
      staffPermissions: 'none',
      multiLocation: false,
      apiWebhooks: false,
      support: 'email',
      platformFeePct: 1,
    },
  },
  team: {
    id: 'team',
    order: 2,
    popular: true,
    pricing: { usd: { monthly: 19, yearly: 190 }, clp: { monthly: 19900, yearly: 199000 } },
    limits: { staff: 5, extraSeatUsd: null, extraSeatClp: null, services: UNLIMITED, bookingsPerMonth: UNLIMITED, whatsappPerMonth: 500 },
    features: {
      poweredByRessy: false,
      customDomain: false,
      emailReminders: true,
      whatsapp: true,
      deposits: true,
      noShowPolicy: true,
      googleCalendar: true,
      crm: 'full',
      reports: 'advanced',
      staffPermissions: 'basic',
      multiLocation: false,
      apiWebhooks: false,
      support: 'email_priority',
      platformFeePct: 0,
    },
  },
  studio: {
    id: 'studio',
    order: 3,
    popular: false,
    pricing: { usd: { monthly: 29, yearly: 290 }, clp: { monthly: 29900, yearly: 299000 } },
    limits: { staff: 15, extraSeatUsd: 3, extraSeatClp: 2900, services: UNLIMITED, bookingsPerMonth: UNLIMITED, whatsappPerMonth: 2000 },
    features: {
      poweredByRessy: false,
      customDomain: true,
      emailReminders: true,
      whatsapp: true,
      deposits: true,
      noShowPolicy: true,
      googleCalendar: true,
      crm: 'full',
      reports: 'advanced_csv',
      staffPermissions: 'granular',
      multiLocation: true,
      apiWebhooks: true,
      support: 'chat_priority',
      platformFeePct: 0,
    },
  },
};

/** Orden canónico para iterar (cards, comparaciones de upgrade). */
export const PLAN_ORDER: PlanId[] = ['free', 'solo', 'team', 'studio'];

// ---------------------------------------------------------------------------
// Helpers — gating consistente y testeable
// ---------------------------------------------------------------------------

/** ¿Es un id de plan válido? Útil al leer un tier crudo de la DB. */
export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}

/** Plan por id; cae a Free si el valor es inválido (defensivo, nunca lanza). */
export function getPlan(id: PlanId | string | null | undefined): Plan {
  return isPlanId(id) ? PLANS[id] : PLANS.free;
}

/** Valor de un límite numérico (`UNLIMITED` para ∞). */
export function getLimit(id: PlanId | string | null | undefined, key: keyof PlanLimits): number {
  const value = getPlan(id).limits[key];
  return value === null ? 0 : value;
}

/** ¿El plan tiene la feature? Los booleanos se devuelven tal cual; los niveles → true si ≠ 'none'/'basic-sin-valor'. */
export function canUseFeature(id: PlanId | string | null | undefined, key: keyof PlanFeatures): boolean {
  const value = getPlan(id).features[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0; // p. ej. platformFeePct: “tiene fee”
  // Niveles string: 'none' = no la tiene; cualquier otro = sí.
  return value !== 'none';
}

/** Precio en unidad mayor para la moneda y ciclo pedidos. */
export function priceFor(id: PlanId | string | null | undefined, currency: Currency, cycle: BillingCycle): number {
  return getPlan(id).pricing[currency][cycle];
}

/** ¿`used` alcanzó el tope del límite? `UNLIMITED` nunca topa. */
export function isAtLimit(id: PlanId | string | null | undefined, key: keyof PlanLimits, used: number): boolean {
  return used >= getLimit(id, key);
}

/**
 * El plan MÁS BARATO (en orden canónico) que satisface un límite numérico dado.
 * Alimenta los CTAs "mejora a X para esto". `null` si ninguno alcanza.
 *
 * Caso especial `staff`: un plan con asientos extra (`extraSeatUsd != null`)
 * puede crecer sobre su base, así que satisface cualquier cantidad.
 */
export function planForLimit(key: keyof PlanLimits, needed: number): PlanId | null {
  for (const id of PLAN_ORDER) {
    const plan = PLANS[id];
    if (getLimit(id, key) >= needed) return id;
    if (key === 'staff' && plan.limits.extraSeatUsd !== null) return id;
  }
  return null;
}

/**
 * El plan MÁS BARATO que habilita una feature. Alimenta "mejora a X para
 * desbloquear no-show / dominio propio / …". `null` si ninguno la tiene.
 */
export function planForFeature(key: keyof PlanFeatures): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (canUseFeature(id, key)) return id;
  }
  return null;
}

/** Índice en el orden canónico (para comparar upgrades/downgrades). */
export function planRank(id: PlanId): number {
  return PLAN_ORDER.indexOf(id);
}
