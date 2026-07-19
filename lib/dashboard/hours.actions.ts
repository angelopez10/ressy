'use server';

/**
 * Guarda horarios semanales: del negocio (business_hours) y de cada profesional
 * (staff_schedules). Ambos son hora LOCAL del negocio (CLAUDE.md §3). RLS
 * `admins manage business_hours` / `staff manage own schedule`. Se reemplaza el
 * set completo (borrar + insertar): el editor manda la semana entera.
 */

import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import { getDashboardContext } from './context';

export type HoursActionResult = { ok: true } | { ok: false; error: string };

const daySchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((d) => d.endTime > d.startTime, { message: 'range' });

const daysSchema = z.array(daySchema).max(7);

export async function saveBusinessHours(raw: unknown): Promise<HoursActionResult> {
  const ctx = await getDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return { ok: false, error: 'notAuthorized' };
  const parsed = daysSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const db = await createClient();

  await db.from('business_hours').delete().eq('business_id', ctx.business.id);
  if (parsed.data.length > 0) {
    const { error } = await db.from('business_hours').insert(
      parsed.data.map((d) => ({
        business_id: ctx.business.id,
        weekday: d.weekday,
        open_time: d.startTime,
        close_time: d.endTime,
      })),
    );
    if (error) return { ok: false, error: 'generic' };
  }
  return { ok: true };
}

export async function saveStaffSchedule(staffId: string, raw: unknown): Promise<HoursActionResult> {
  const ctx = await getDashboardContext();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const id = z.guid().parse(staffId);
  const parsed = daysSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const db = await createClient();

  await db.from('staff_schedules').delete().eq('staff_member_id', id);
  if (parsed.data.length > 0) {
    const { error } = await db.from('staff_schedules').insert(
      parsed.data.map((d) => ({
        business_id: ctx.business.id,
        staff_member_id: id,
        weekday: d.weekday,
        start_time: d.startTime,
        end_time: d.endTime,
      })),
    );
    if (error) return { ok: false, error: 'generic' };
  }
  return { ok: true };
}
