'use server';

/** Escrituras del mini-CRM. `business_id` del contexto; RLS `members manage customers`. */

import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import { getDashboardContext } from './context';

export type ClientActionResult = { ok: true; id: string } | { ok: false; error: string };

const customerInput = z
  .object({
    id: z.guid().optional(),
    fullName: z.string().trim().min(1, 'nameRequired').max(120),
    email: z.union([z.email(), z.literal('')]).optional(),
    phone: z.union([z.string().trim().min(6).max(30), z.literal('')]).optional(),
  })
  .refine((d) => Boolean(d.id) || Boolean(d.email) || Boolean(d.phone), {
    message: 'contactRequired',
    path: ['email'],
  });

export async function saveCustomer(raw: unknown): Promise<ClientActionResult> {
  const ctx = await getDashboardContext();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = customerInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'generic' };
  const input = parsed.data;
  const db = await createClient();

  const row = {
    business_id: ctx.business.id,
    full_name: input.fullName,
    email: input.email || null,
    phone: input.phone || null,
  };

  if (input.id) {
    const { error } = await db.from('customers').update(row).eq('id', input.id);
    if (error) return { ok: false, error: 'generic' };
    return { ok: true, id: input.id };
  }
  const { data, error } = await db.from('customers').insert(row).select('id').single();
  if (error || !data) return { ok: false, error: 'generic' };
  return { ok: true, id: data.id };
}

const notesInput = z.object({
  id: z.guid(),
  notes: z.string().trim().max(2000),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
});

export async function updateCustomerNotes(raw: unknown): Promise<ClientActionResult> {
  const ctx = await getDashboardContext();
  if (!ctx) return { ok: false, error: 'notAuthorized' };
  const parsed = notesInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const db = await createClient();
  const { error } = await db
    .from('customers')
    .update({ notes: parsed.data.notes || null, tags: parsed.data.tags })
    .eq('id', parsed.data.id)
    .eq('business_id', ctx.business.id);
  if (error) return { ok: false, error: 'generic' };
  return { ok: true, id: parsed.data.id };
}
