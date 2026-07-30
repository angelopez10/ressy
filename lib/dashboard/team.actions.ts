'use server';

/**
 * Escrituras de Equipo. El alta pasa por la RPC `create_staff_member`, que
 * valida admin, tenant y el LÍMITE POR PLAN en la DB (no solo en la UI). Los
 * permisos, por `set_staff_permissions`. Editar nombre/rol/servicios va por RLS
 * `admins manage staff` / `admins manage service_staff`.
 */

import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import { getWritableDashboardContext } from './context';
import { trackServer } from '@/lib/analytics/server';

export type TeamActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireAdmin() {
  // Escritura ⇒ contexto escribible: bloquea la impersonación de soporte.
  const ctx = await getWritableDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return null;
  return ctx;
}

async function syncStaffServices(
  db: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  staffId: string,
  serviceIds: string[],
) {
  await db.from('service_staff').delete().eq('staff_member_id', staffId);
  if (serviceIds.length > 0) {
    await db.from('service_staff').insert(
      serviceIds.map((sid) => ({ business_id: businessId, service_id: sid, staff_member_id: staffId })),
    );
  }
}

const staffInput = z.object({
  id: z.guid().optional(),
  name: z.string().trim().min(1, 'nameRequired').max(120),
  role: z.string().trim().max(80).optional(),
  canViewAll: z.boolean().default(false),
  serviceIds: z.array(z.guid()).default([]),
});

export async function saveStaff(raw: unknown): Promise<TeamActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = staffInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'generic' };
  const input = parsed.data;
  const db = await createClient();

  if (input.id) {
    const { error } = await db
      .from('staff_members')
      .update({ name: input.name, role: input.role || null })
      .eq('id', input.id);
    if (error) return { ok: false, error: 'generic' };
    await syncStaffServices(db, ctx.business.id, input.id, input.serviceIds);
    // Permiso por su función dedicada.
    await db.rpc('set_staff_permissions', { p_staff_member_id: input.id, p_can_view_all: input.canViewAll });
    return { ok: true, id: input.id };
  }

  // Alta con límite por plan (RPC).
  const { data, error } = await db.rpc('create_staff_member', {
    p_business_id: ctx.business.id,
    p_name: input.name,
    p_role: input.role || null,
    p_can_view_all: input.canViewAll,
    p_service_ids: input.serviceIds,
  });
  if (error) {
    if (error.message === 'plan_limit_reached') {
      await trackServer('plan_limit_reached', ctx.business.id, { plan: ctx.tier, limit: 'staff' });
      return { ok: false, error: 'planLimit' };
    }
    return { ok: false, error: 'generic' };
  }
  return { ok: true, id: data as string };
}

export async function removeStaff(id: string): Promise<TeamActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const db = await createClient();
  const { error } = await db
    .from('staff_members')
    .update({ is_active: false })
    .eq('id', z.guid().parse(id))
    .eq('business_id', ctx.business.id);
  if (error) return { ok: false, error: 'generic' };
  return { ok: true, id };
}
