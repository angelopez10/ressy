import 'server-only';

/**
 * Contexto de tenant del dashboard: el negocio del usuario, su plan y los
 * permisos del miembro actual. Fuente única para todas las pantallas, así
 * ninguna re-deriva el tenant a mano (CLAUDE.md §3). Todo pasa por el cliente
 * autenticado, así que RLS acota lo que se ve.
 */

import { createClient } from '@/lib/db/server';
import type { Enums } from '@/lib/db/types';

export { STAFF_LIMIT } from './plan';

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
  };
  tier: Enums<'subscription_tier'>;
  /** ¿El miembro actual ve toda la agenda o solo lo suyo? (admins ⇒ true) */
  canViewAll: boolean;
  /** staff_member del usuario actual en este negocio, si tiene uno. */
  staffMemberId: string | null;
  role: Enums<'business_role'> | null;
}

export async function getDashboardContext(): Promise<DashboardContext | null> {
  const db = await createClient();

  const { data: biz } = await db
    .from('businesses')
    .select(
      'id, slug, name, category, timezone, currency, booking_locale, accent_color, logo_url, address, is_published',
    )
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!biz) return null;

  const [{ data: sub }, { data: member }] = await Promise.all([
    db.from('subscriptions').select('tier').eq('business_id', biz.id).maybeSingle(),
    db
      .from('business_members')
      .select('role')
      .eq('business_id', biz.id)
      .maybeSingle(),
  ]);

  const { data: canViewAll } = await db.rpc('can_view_all_bookings', {
    target_business_id: biz.id,
  });
  const { data: staffId } = await db.rpc('current_staff_member_id', {
    target_business_id: biz.id,
  });

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
    },
    tier: sub?.tier ?? 'free',
    canViewAll: Boolean(canViewAll),
    staffMemberId: staffId ?? null,
    role: member?.role ?? null,
  };
}
