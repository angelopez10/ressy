import 'server-only';

/**
 * Contexto de tenant del dashboard: el negocio actual, su plan y los permisos
 * del miembro. Fuente única para todas las pantallas, así ninguna re-deriva el
 * tenant a mano (CLAUDE.md §3).
 *
 * Normalmente todo pasa por el cliente autenticado y RLS acota lo que se ve. La
 * ÚNICA excepción es una impersonación de soporte verificada, donde el tenant
 * lo fija `lib/dashboard/tenant.ts` y las queries filtran por `business_id` de
 * forma explícita porque ya no hay RLS de red.
 */

import { toTrialInfo, type TrialInfo } from '@/lib/plans/status';
import { isPlanId } from '@/lib/plans/config';
import type { Enums } from '@/lib/db/types';
import { resolveTenant } from './tenant';

export { STAFF_LIMIT } from './plan';

/** Sesión de soporte activa. Si no es null, el dashboard es de SOLO LECTURA. */
export interface ImpersonationContext {
  businessId: string;
  adminEmail: string;
  expiresAt: string;
}

export interface DashboardContext {
  business: {
    id: string;
    slug: string;
    name: string;
    category: string | null;
    timezone: string;
    currency: string;
    bookingLocale: 'es' | 'en';
    accentColor: string | null;
    logoUrl: string | null;
    address: string | null;
    isPublished: boolean;
    /** Suspendido por el equipo de Ressy. La booking page queda offline. */
    suspendedAt: string | null;
    suspendedReason: string | null;
  };
  tier: Enums<'subscription_tier'>;
  /** Estado del trial de 14 días (Team). Alimenta el banner del dashboard. */
  trial: TrialInfo;
  /** ¿El miembro actual ve toda la agenda o solo lo suyo? (admins ⇒ true) */
  canViewAll: boolean;
  /** staff_member del usuario actual en este negocio, si tiene uno. */
  staffMemberId: string | null;
  role: Enums<'business_role'> | null;
  /** No-null solo bajo una impersonación verificada. */
  impersonation: ImpersonationContext | null;
}

/**
 * Contexto para ESCRIBIR. Devuelve null bajo una impersonación de soporte: la
 * sesión de soporte es de solo lectura (CLAUDE.md · sesión 13).
 *
 * Se prefiere esto a "pedir doble confirmación en las acciones peligrosas"
 * porque no depende de clasificar bien cada action: toda escritura nueva que
 * alguien agregue mañana queda cubierta por omisión, no por memoria.
 *
 * No es la única defensa: bajo impersonación el admin no es `business_member`,
 * así que RLS y las funciones SECURITY DEFINER también rechazan la escritura.
 * Esto lo hace explícito y produce un error entendible en vez de un vacío raro.
 */
export async function getWritableDashboardContext(): Promise<DashboardContext | null> {
  const ctx = await getDashboardContext();
  if (!ctx) return null;
  if (ctx.impersonation) return null;
  return ctx;
}

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const { db, businessId, impersonation } = tenant;

  const { data: biz } = await db
    .from('businesses')
    .select(
      'id, slug, name, category, timezone, currency, booking_locale, accent_color, logo_url, address, is_published, suspended_at, suspended_reason',
    )
    .eq('id', businessId)
    .maybeSingle();
  if (!biz) return null;

  const [{ data: sub }, { data: member }] = await Promise.all([
    db
      .from('subscriptions')
      .select('tier, is_trial, trial_ends_at')
      .eq('business_id', biz.id)
      .maybeSingle(),
    db.from('business_members').select('role').eq('business_id', biz.id).maybeSingle(),
  ]);

  // Estas RPC resuelven contra `auth.uid()`. Bajo impersonación no hay usuario
  // del negocio, así que no se llaman: el soporte ve la agenda completa (es
  // solo lectura) y no tiene staff_member propio.
  let canViewAll = true;
  let staffMemberId: string | null = null;

  if (!impersonation) {
    const [{ data: canViewAllRes }, { data: staffId }] = await Promise.all([
      db.rpc('can_view_all_bookings', { target_business_id: biz.id }),
      db.rpc('current_staff_member_id', { target_business_id: biz.id }),
    ]);
    canViewAll = Boolean(canViewAllRes);
    staffMemberId = staffId ?? null;
  }

  return {
    business: {
      id: biz.id,
      slug: biz.slug,
      name: biz.name,
      category: biz.category,
      timezone: biz.timezone,
      currency: biz.currency,
      bookingLocale: biz.booking_locale === 'en' ? 'en' : 'es',
      accentColor: biz.accent_color,
      logoUrl: biz.logo_url,
      address: biz.address,
      isPublished: biz.is_published,
      suspendedAt: biz.suspended_at,
      suspendedReason: biz.suspended_reason,
    },
    tier: isPlanId(sub?.tier) ? sub.tier : 'free',
    trial: toTrialInfo({
      is_trial: sub?.is_trial ?? false,
      trial_ends_at: sub?.trial_ends_at ?? null,
    }),
    canViewAll,
    staffMemberId,
    role: member?.role ?? null,
    impersonation: impersonation
      ? {
          businessId: impersonation.businessId,
          adminEmail: impersonation.adminEmail,
          expiresAt: impersonation.expiresAt,
        }
      : null,
  };
}
