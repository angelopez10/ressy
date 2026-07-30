'use server';

/**
 * Escrituras de Ajustes. `business_id` del contexto; RLS `admins update own
 * business` / `admins manage policies`. Las políticas alimentan el motor de
 * disponibilidad, así que un cambio aquí se refleja en la booking page al
 * instante (el motor lee estos valores en cada cálculo).
 */

import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/service';
import { getConnectionInfo } from '@/lib/payments/mercadopago/account';
import { canUseFeature } from '@/lib/plans/config';
import { getDashboardContext, getWritableDashboardContext } from './context';

export type SettingsResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  // Escritura ⇒ contexto escribible: bloquea la impersonación de soporte.
  const ctx = await getWritableDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return null;
  return ctx;
}

const businessInput = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(120),
  category: z.string().trim().max(60).optional(),
  address: z.string().trim().max(200).optional(),
  timezone: z.string().trim().min(1).max(60),
});

export async function saveBusinessInfo(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = businessInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'generic' };
  const db = await createClient();
  const { error } = await db
    .from('businesses')
    .update({
      name: parsed.data.name,
      category: parsed.data.category || null,
      address: parsed.data.address || null,
      timezone: parsed.data.timezone,
    })
    .eq('id', ctx.business.id);
  if (error) return { ok: false, error: 'generic' };
  return { ok: true };
}

const policiesInput = z
  .object({
    minLeadTimeMin: z.coerce.number().int().min(0).max(20160),
    maxAdvanceDays: z.coerce.number().int().min(1).max(730),
    cancellationWindowHours: z.coerce.number().int().min(0).max(720),
    depositType: z.enum(['none', 'percent', 'fixed']),
    depositPercent: z.coerce.number().int().min(1).max(100).nullable().optional(),
    depositAmount: z.coerce.number().int().min(0).nullable().optional(),
    noShowFeeAmount: z.coerce.number().int().min(0),
  })
  // Coherencia igual que el CHECK de la tabla.
  .refine(
    (d) =>
      (d.depositType === 'none') ||
      (d.depositType === 'percent' && d.depositPercent != null) ||
      (d.depositType === 'fixed' && d.depositAmount != null),
    { message: 'generic' },
  );

export async function savePolicies(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = policiesInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const d = parsed.data;

  // Gating de anticipos (capa de datos): activar cobro de anticipo exige plan
  // pago Y cuenta MP conectada. Si no, se rechaza (no solo se oculta el botón).
  if (d.depositType !== 'none') {
    if (!canUseFeature(ctx.tier, 'deposits')) return { ok: false, error: 'depositPlan' };
    const conn = await getConnectionInfo(createServiceClient(), ctx.business.id);
    if (conn.status !== 'connected') return { ok: false, error: 'depositNoMp' };
  }

  const db = await createClient();
  const { error } = await db
    .from('business_policies')
    .update({
      min_lead_time_min: d.minLeadTimeMin,
      max_advance_days: d.maxAdvanceDays,
      cancellation_window_hours: d.cancellationWindowHours,
      deposit_type: d.depositType,
      deposit_percent: d.depositType === 'percent' ? d.depositPercent : null,
      deposit_amount: d.depositType === 'fixed' ? d.depositAmount : null,
      no_show_fee_amount: d.noShowFeeAmount,
    })
    .eq('business_id', ctx.business.id);
  if (error) return { ok: false, error: 'generic' };
  return { ok: true };
}

const pageInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'slugFormat')
    .min(2)
    .max(50),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  bookingLocale: z.enum(['es', 'en']),
  isPublished: z.boolean(),
});

export async function saveBookingPage(raw: unknown): Promise<SettingsResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = pageInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'generic' };
  const db = await createClient();

  // Unicidad del slug (excluyendo el propio negocio) vía la función definer.
  if (parsed.data.slug !== ctx.business.slug) {
    const { data: available } = await db.rpc('is_slug_available', {
      p_slug: parsed.data.slug,
      p_exclude_business: ctx.business.id,
    });
    if (!available) return { ok: false, error: 'slugTaken' };
  }

  const { error } = await db
    .from('businesses')
    .update({
      slug: parsed.data.slug,
      accent_color: parsed.data.accentColor ?? null,
      booking_locale: parsed.data.bookingLocale,
      is_published: parsed.data.isPublished,
    })
    .eq('id', ctx.business.id);
  if (error) return { ok: false, error: 'generic' };
  return { ok: true };
}

/** Guarda la URL del logo tras subirlo al bucket (la subida la hace el cliente). */
export async function updateLogoUrl(url: string): Promise<SettingsResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = z.url().safeParse(url);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const db = await createClient();
  const { error } = await db.from('businesses').update({ logo_url: parsed.data }).eq('id', ctx.business.id);
  if (error) return { ok: false, error: 'generic' };
  return { ok: true };
}

/** Chequeo en vivo de disponibilidad del slug para el input del tab Página. */
export async function checkSlug(slug: string): Promise<boolean> {
  const ctx = await getDashboardContext();
  if (!ctx) return false;
  if (slug === ctx.business.slug) return true;
  const db = await createClient();
  const { data } = await db.rpc('is_slug_available', {
    p_slug: slug,
    p_exclude_business: ctx.business.id,
  });
  return Boolean(data);
}
