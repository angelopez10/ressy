'use server';

/**
 * ============================================================================
 * Ressy — Server actions del panel de Super Admin
 * ============================================================================
 * ⚠️ CADA action empieza con `requireAdmin()` (o `requireAdminRole('owner')`).
 * No es una formalidad: en Next una server action es un endpoint POST
 * direccionable por sí mismo, así que el guard del layout NO la protege. Si una
 * action de este archivo no arranca con el guard, es un agujero.
 *
 * Las acciones que tocan datos de negocio delegan en RPCs SECURITY DEFINER que
 * escriben su propia fila de auditoría en la MISMA transacción: no puede pasar
 * que la acción ocurra y el registro no.
 * ============================================================================
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Enums } from '@/lib/db/types';
import { createAdminDb } from './db';
import { requireAdmin, requireAdminIdentity, requireAdminRole } from './guard';
import { endImpersonation, startImpersonation } from './impersonation';
import { endAdminSession, startOtpChallenge, verifyOtpAndElevate } from './session';

export type AdminActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Step-up (OTP). Estas dos NO pueden pedir elevación —es justo lo que están
// tratando de conseguir—, pero sí exigen identidad de staff: para un dueño de
// negocio hacen 404 igual que el resto del panel.
// ---------------------------------------------------------------------------

/** Manda (o re-manda) el código al email del admin. */
export async function requestAdminCode(): Promise<AdminActionResult> {
  const identity = await requireAdminIdentity();
  const res = await startOtpChallenge(identity);
  if (res.ok) return { ok: true };

  const messages: Record<string, string> = {
    cooldown: 'Recién te mandamos un código. Esperá un minuto antes de pedir otro.',
    email_failed: 'No pudimos enviar el email. Revisá la configuración de Resend.',
    not_configured: 'El panel no está configurado correctamente.',
  };
  return { ok: false, error: messages[res.reason] ?? 'No se pudo enviar el código.' };
}

/** Verifica el código y abre la sesión elevada. */
export async function verifyAdminCode(raw: unknown): Promise<AdminActionResult> {
  const identity = await requireAdminIdentity();
  const parsed = z
    .object({ code: z.string().trim().regex(/^\d{6}$/, 'El código son 6 dígitos.') })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'El código son 6 dígitos.' };

  const res = await verifyOtpAndElevate(identity, parsed.data.code);
  if (res.ok) return { ok: true };

  // Mensajes deliberadamente parejos: no se distingue "código incorrecto" de
  // "no había ningún desafío abierto".
  const messages: Record<string, string> = {
    invalid: 'Código incorrecto o vencido. Pedí uno nuevo.',
    expired: 'El código venció. Pedí uno nuevo.',
    too_many_attempts: 'Demasiados intentos. Pedí un código nuevo.',
    not_configured: 'El panel no está configurado correctamente.',
  };
  return { ok: false, error: messages[res.reason] ?? 'No se pudo verificar el código.' };
}

const uuid = z.guid();
const reason = z.string().trim().min(3, 'Contá el motivo (mínimo 3 caracteres).').max(500);

/** Impersonar: abre la sesión de soporte de SOLO LECTURA y va al dashboard. */
export async function impersonateBusiness(raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  const parsed = z.object({ businessId: uuid, reason }).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const res = await startImpersonation(actor, parsed.data.businessId, parsed.data.reason);
  if (!res.ok) {
    return {
      ok: false,
      error: res.reason === 'not_found' ? 'Ese negocio no existe.' : 'No se pudo iniciar la sesión.',
    };
  }
  return { ok: true };
}

/**
 * Salir de la impersonación. No lleva `requireAdmin()` a propósito: si la
 * elevación venció mientras había una sesión abierta, el usuario TIENE que
 * poder salir igual. `endImpersonation` borra la cookie pase lo que pase y solo
 * marca la fila si el actor sigue siendo válido.
 */
export async function stopImpersonation(): Promise<AdminActionResult> {
  await endImpersonation();
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Cierra la elevación del panel (no la sesión de Supabase). */
export async function signOutAdmin(): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  await endAdminSession(actor);
  return { ok: true };
}

/** Extender el trial. Concesión blanda: soporte también puede. */
export async function extendTrial(raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdmin();
  const parsed = z
    .object({ businessId: uuid, days: z.coerce.number().int().min(1).max(90) })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Cantidad de días inválida (1 a 90).' };

  const db = createAdminDb(actor);
  const { error } = await db.rpc('admin_extend_trial', {
    p_business_id: parsed.data.businessId,
    p_days: parsed.data.days,
    p_admin_user_id: actor.userId,
    p_admin_email: actor.email,
    p_ip: actor.ip,
    p_user_agent: actor.userAgent,
  });
  if (error) {
    console.error('[admin] extendTrial falló', { business_id: parsed.data.businessId, error: error.message });
    return { ok: false, error: 'No se pudo extender el trial.' };
  }
  revalidatePath(`/admin/negocios/${parsed.data.businessId}`);
  return { ok: true };
}

const TIERS = ['free', 'solo', 'team', 'studio'] as const;

/** Cambiar el plan a mano. Toca dinero ⇒ solo `owner`. */
export async function changePlan(raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdminRole('owner');
  const parsed = z.object({ businessId: uuid, tier: z.enum(TIERS), reason }).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const db = createAdminDb(actor);
  const { error } = await db.rpc('admin_change_plan', {
    p_business_id: parsed.data.businessId,
    p_tier: parsed.data.tier as Enums<'subscription_tier'>,
    p_reason: parsed.data.reason,
    p_admin_user_id: actor.userId,
    p_admin_email: actor.email,
    p_ip: actor.ip,
    p_user_agent: actor.userAgent,
  });
  if (error) {
    console.error('[admin] changePlan falló', { business_id: parsed.data.businessId, error: error.message });
    return { ok: false, error: 'No se pudo cambiar el plan.' };
  }
  revalidatePath(`/admin/negocios/${parsed.data.businessId}`);
  return { ok: true };
}

/** Suspender / reactivar. Destructiva (apaga la booking page) ⇒ solo `owner`. */
export async function setSuspended(raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdminRole('owner');
  const parsed = z.object({ businessId: uuid, suspended: z.boolean(), reason }).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const db = createAdminDb(actor);
  const { error } = await db.rpc('admin_set_suspended', {
    p_business_id: parsed.data.businessId,
    p_suspended: parsed.data.suspended,
    p_reason: parsed.data.reason,
    p_admin_user_id: actor.userId,
    p_admin_email: actor.email,
    p_ip: actor.ip,
    p_user_agent: actor.userAgent,
  });
  if (error) {
    console.error('[admin] setSuspended falló', { business_id: parsed.data.businessId, error: error.message });
    return { ok: false, error: 'No se pudo cambiar el estado de la cuenta.' };
  }
  revalidatePath(`/admin/negocios/${parsed.data.businessId}`);
  return { ok: true };
}

/** Cancelar la suscripción al final del período. Toca dinero ⇒ solo `owner`. */
export async function cancelSubscription(raw: unknown): Promise<AdminActionResult> {
  const actor = await requireAdminRole('owner');
  const parsed = z.object({ businessId: uuid, reason }).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const db = createAdminDb(actor);
  const { error } = await db.rpc('admin_cancel_subscription', {
    p_business_id: parsed.data.businessId,
    p_reason: parsed.data.reason,
    p_admin_user_id: actor.userId,
    p_admin_email: actor.email,
    p_ip: actor.ip,
    p_user_agent: actor.userAgent,
  });
  if (error) {
    console.error('[admin] cancelSubscription falló', {
      business_id: parsed.data.businessId,
      error: error.message,
    });
    return { ok: false, error: 'No se pudo cancelar la suscripción.' };
  }
  revalidatePath(`/admin/negocios/${parsed.data.businessId}`);
  return { ok: true };
}
