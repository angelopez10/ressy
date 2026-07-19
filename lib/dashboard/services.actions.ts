'use server';

/**
 * Escrituras de Servicios. El `business_id` SIEMPRE sale del contexto de sesión
 * (nunca del cliente), y la RLS `admins manage services` es la última línea. Los
 * enlaces service_staff los valida además el trigger de tenant de la migración 03.
 * Desactivar ≠ borrar: las reservas que referencian el servicio se conservan.
 */

import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import { getDashboardContext } from './context';

const serviceInput = z.object({
  id: z.guid().optional(),
  name: z.string().trim().min(1, 'nameRequired').max(120),
  description: z.string().trim().max(500).optional(),
  durationMin: z.coerce.number().int().min(5, 'durationRequired').max(600),
  priceAmount: z.coerce.number().int().min(0, 'priceInvalid'),
  bufferBeforeMin: z.coerce.number().int().min(0).max(240).default(0),
  bufferAfterMin: z.coerce.number().int().min(0).max(240).default(0),
  isActive: z.boolean().default(true),
  staffIds: z.array(z.guid()).default([]),
});

export type ServiceActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireAdmin() {
  const ctx = await getDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return null;
  return ctx;
}

/** Reemplaza los enlaces service_staff de un servicio por la lista dada. */
async function syncServiceStaff(
  db: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  serviceId: string,
  staffIds: string[],
) {
  await db.from('service_staff').delete().eq('service_id', serviceId);
  if (staffIds.length > 0) {
    await db.from('service_staff').insert(
      staffIds.map((sid) => ({ business_id: businessId, service_id: serviceId, staff_member_id: sid })),
    );
  }
}

export async function saveService(raw: unknown): Promise<ServiceActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = serviceInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'generic' };
  }
  const input = parsed.data;
  const db = await createClient();

  const row = {
    business_id: ctx.business.id,
    name: input.name,
    description: input.description || null,
    duration_min: input.durationMin,
    price_amount: input.priceAmount,
    buffer_before_min: input.bufferBeforeMin,
    buffer_after_min: input.bufferAfterMin,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await db.from('services').update(row).eq('id', input.id);
    if (error) return { ok: false, error: 'generic' };
    await syncServiceStaff(db, ctx.business.id, input.id, input.staffIds);
    return { ok: true, id: input.id };
  }

  // Nuevo: sort_order al final.
  const { data: maxRow } = await db
    .from('services')
    .select('sort_order')
    .eq('business_id', ctx.business.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await db
    .from('services')
    .insert({ ...row, sort_order: sortOrder })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'generic' };
  await syncServiceStaff(db, ctx.business.id, data.id, input.staffIds);
  return { ok: true, id: data.id };
}

export async function setServiceActive(id: string, active: boolean): Promise<ServiceActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const db = await createClient();
  const { error } = await db.from('services').update({ is_active: active }).eq('id', z.guid().parse(id));
  if (error) return { ok: false, error: 'generic' };
  return { ok: true, id };
}

export async function reorderServices(orderedIds: string[]): Promise<ServiceActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const ids = z.array(z.guid()).parse(orderedIds);
  const db = await createClient();
  // sort_order = índice+1. Updates secuenciales (listas de servicios son cortas).
  await Promise.all(
    ids.map((id, i) =>
      db.from('services').update({ sort_order: i + 1 }).eq('id', id).eq('business_id', ctx.business.id),
    ),
  );
  return { ok: true, id: ids[0] ?? '' };
}
