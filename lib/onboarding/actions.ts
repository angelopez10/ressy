'use server';

import { createClient } from '@/lib/db/server';
import { getUser } from '@/lib/auth/session';
import {
  businessBasicsSchema,
  pageStepSchema,
  scheduleStepSchema,
  servicesStepSchema,
} from './schema';

type Result<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error('not_authenticated');
  return user;
}

/** Id del staff_member owner (ligado a la cuenta) del negocio. */
async function ownerStaffId(
  db: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  userId: string,
): Promise<string | null> {
  const { data } = await db
    .from('staff_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Paso 1 — datos del negocio
// ---------------------------------------------------------------------------
export async function saveBasics(raw: unknown): Promise<Result<{ businessId: string }>> {
  const parsed = businessBasicsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const input = parsed.data;

  const user = await requireUser();
  const db = await createClient();

  // ¿Ya tiene negocio? Entonces actualiza; si no, lo crea (RPC transaccional).
  const { data: existing } = await db
    .from('businesses')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error: bizErr } = await db
      .from('businesses')
      .update({
        name: input.name,
        category: input.category,
        timezone: input.timezone,
        currency: input.currency,
      })
      .eq('id', existing.id);
    if (bizErr) return { ok: false, error: 'saveFailed' };

    // El nombre del owner vive en su staff_member.
    const staffId = await ownerStaffId(db, existing.id, user.id);
    if (staffId) {
      await db.from('staff_members').update({ name: input.ownerName }).eq('id', staffId);
    }
    return { ok: true, data: { businessId: existing.id } };
  }

  const { data: businessId, error } = await db.rpc('create_business', {
    p_name: input.name,
    p_category: input.category,
    p_timezone: input.timezone,
    p_currency: input.currency,
    p_booking_locale: 'es',
    p_owner_name: input.ownerName,
  });
  if (error || !businessId) return { ok: false, error: 'saveFailed' };
  return { ok: true, data: { businessId } };
}

// ---------------------------------------------------------------------------
// Paso 2 — servicios (reemplaza el set completo)
// ---------------------------------------------------------------------------
export async function saveServices(businessId: string, raw: unknown): Promise<Result> {
  const parsed = servicesStepSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };

  const user = await requireUser();
  const db = await createClient();
  const staffId = await ownerStaffId(db, businessId, user.id);
  if (!staffId) return { ok: false, error: 'saveFailed' };

  // Durante el onboarding el negocio no tiene reservas, así que borrar y reinsertar
  // es seguro (el FK RESTRICT de bookings solo mordería con historial). Borra en
  // cascada service_staff.
  const { error: delErr } = await db.from('services').delete().eq('business_id', businessId);
  if (delErr) return { ok: false, error: 'saveFailed' };

  const rows = parsed.data.services.map((s, i) => ({
    business_id: businessId,
    name: s.name,
    duration_min: s.durationMin,
    price_amount: s.priceAmount,
    buffer_after_min: s.bufferAfterMin,
    sort_order: i,
    is_active: true,
  }));
  const { data: inserted, error: insErr } = await db.from('services').insert(rows).select('id');
  if (insErr || !inserted) return { ok: false, error: 'saveFailed' };

  // Liga cada servicio al owner (único staff del MVP).
  const links = inserted.map((s) => ({
    business_id: businessId,
    service_id: s.id,
    staff_member_id: staffId,
  }));
  const { error: linkErr } = await db.from('service_staff').insert(links);
  if (linkErr) return { ok: false, error: 'saveFailed' };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Paso 3 — horario (business_hours + staff_schedules del owner)
// ---------------------------------------------------------------------------
export async function saveSchedule(businessId: string, raw: unknown): Promise<Result> {
  const parsed = scheduleStepSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };

  const user = await requireUser();
  const db = await createClient();
  const staffId = await ownerStaffId(db, businessId, user.id);
  if (!staffId) return { ok: false, error: 'saveFailed' };

  const openDays = parsed.data.days.filter((d) => d.open);
  if (openDays.length === 0) return { ok: false, error: 'atLeastOneDay' };

  // Reemplaza: borra horario previo y reinserta. Hora local + tz (nunca UTC).
  await db.from('business_hours').delete().eq('business_id', businessId);
  await db.from('staff_schedules').delete().eq('business_id', businessId);

  const hours = openDays.map((d) => ({
    business_id: businessId,
    weekday: d.weekday,
    open_time: d.startTime,
    close_time: d.endTime,
  }));
  const schedules = openDays.map((d) => ({
    business_id: businessId,
    staff_member_id: staffId,
    weekday: d.weekday,
    start_time: d.startTime,
    end_time: d.endTime,
  }));

  const { error: hErr } = await db.from('business_hours').insert(hours);
  if (hErr) return { ok: false, error: 'saveFailed' };
  const { error: sErr } = await db.from('staff_schedules').insert(schedules);
  if (sErr) return { ok: false, error: 'saveFailed' };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Paso 4 — página pública (SIN publicar todavía)
// ---------------------------------------------------------------------------
export async function checkSlug(slug: string, businessId: string): Promise<{ available: boolean }> {
  const db = await createClient();
  const { data } = await db.rpc('is_slug_available', {
    p_slug: slug,
    p_exclude_business: businessId,
  });
  return { available: Boolean(data) };
}

/**
 * Guarda la página (slug/color/idioma) SIN publicar: la publicación es el paso
 * final tras elegir plan (paso 5). El índice único de slug enforce la unicidad
 * aunque no esté publicado, así que reservar el slug acá es seguro.
 */
export async function savePage(businessId: string, raw: unknown): Promise<Result<{ slug: string }>> {
  const parsed = pageStepSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' };
  const input = parsed.data;

  await requireUser();
  const db = await createClient();

  const { data: avail } = await db.rpc('is_slug_available', {
    p_slug: input.slug,
    p_exclude_business: businessId,
  });
  if (!avail) return { ok: false, error: 'slugTaken' };

  const { error } = await db
    .from('businesses')
    .update({
      slug: input.slug,
      accent_color: input.accentColor,
      booking_locale: input.bookingLocale,
    })
    .eq('id', businessId);

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'slugTaken' };
    return { ok: false, error: 'saveFailed' };
  }
  return { ok: true, data: { slug: input.slug } };
}

// ---------------------------------------------------------------------------
// Paso 5 — plan (trial de 14 días de Team, sin tarjeta) + PUBLICAR
// ---------------------------------------------------------------------------
/**
 * Publica la booking page. El plan se eligió en el paso 5 pero NO se cobra ni se
 * fuerza acá: todo negocio nuevo arranca en Team trial de 14 días sin tarjeta
 * (CLAUDE.md §1), que ya creó `create_business`. La elección del paso 5 es
 * informativa; el cambio real de plan vive en "Mejorar plan".
 */
export async function publishBusiness(businessId: string): Promise<Result<{ slug: string }>> {
  await requireUser();
  const db = await createClient();

  const { data, error } = await db
    .from('businesses')
    .update({ is_published: true })
    .eq('id', businessId)
    .select('slug')
    .maybeSingle();

  if (error || !data) return { ok: false, error: 'saveFailed' };
  return { ok: true, data: { slug: data.slug } };
}

// ---------------------------------------------------------------------------
// Logo — subida a Storage
// ---------------------------------------------------------------------------
export async function uploadLogo(
  businessId: string,
  formData: FormData,
): Promise<Result<{ url: string }>> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'noFile' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'tooLarge' };

  await requireUser();
  const db = await createClient();

  const ext =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${businessId}/logo-${Date.now()}.${ext}`;

  const { error: upErr } = await db.storage
    .from('business-logos')
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) return { ok: false, error: 'uploadFailed' };

  const { data: pub } = db.storage.from('business-logos').getPublicUrl(path);
  const { error: updErr } = await db
    .from('businesses')
    .update({ logo_url: pub.publicUrl })
    .eq('id', businessId);
  if (updErr) return { ok: false, error: 'saveFailed' };

  return { ok: true, data: { url: pub.publicUrl } };
}
