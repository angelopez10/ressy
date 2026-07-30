import 'server-only';

/**
 * ============================================================================
 * Ressy — Impersonación (solo lectura) para soporte
 * ============================================================================
 * Lo que NO hace, a propósito: no genera una sesión de Supabase del dueño, no
 * canjea magic links, no toca `auth.users`. No hay robo de identidad. Lo que
 * abre es un CONTEXTO DE TENANT elevado, marcado, temporal y de solo lectura.
 *
 * Ésta es la única pieza del panel que toca la resolución de tenant del
 * dashboard del cliente —el lugar donde un bug filtra datos cross-tenant—, así
 * que las condiciones son acumulativas y ninguna alcanza sola:
 *
 *   1. Hay cookie de impersonación (si no, camino rápido: null, sin tocar DB;
 *      es el 100% de los requests reales de negocios).
 *   2. La firma HMAC valida  → una cookie fabricada a mano no pasa de acá.
 *   3. El `exp` del payload no venció.
 *   4. `getAdminActor()` pasa → o sea: sesión de Supabase válida + fila vigente
 *      en `ressy_admins` + allowlist + elevación OTP viva. Una cookie robada,
 *      sin ser admin, no sirve para nada.
 *   5. La fila en `admin_impersonations` existe, es de ESTE admin, no terminó y
 *      no venció. La fila manda: terminarla corta el acceso al instante.
 *
 * Es de SOLO LECTURA: `assertNotImpersonating()` la usan las server actions de
 * escritura del dashboard. Un invariante de una línea vale más que auditar
 * treinta actions de a una.
 * ============================================================================
 */

import { cookies } from 'next/headers';
import { logAdminAction } from './audit';
import { createAdminDb } from './db';
import { IMPERSONATION_COOKIE, IMPERSONATION_TTL_MINUTES } from './env';
import { getAdminActor, type AdminActor } from './guard';
import { isExpired, signPayload, verifyPayload } from './signing';

export interface ActiveImpersonation {
  id: string;
  businessId: string;
  adminUserId: string;
  adminEmail: string;
  expiresAt: string;
}

/**
 * Devuelve la impersonación vigente, o null. Camino rápido sin cookie: cero
 * queries, para no cobrarle latencia al dashboard de los negocios reales.
 */
export async function getActiveImpersonation(): Promise<ActiveImpersonation | null> {
  const jar = await cookies();
  const signed = jar.get(IMPERSONATION_COOKIE)?.value;
  if (!signed) return null; // (1) camino rápido

  // (2) y (3): firma y vencimiento del payload.
  const payload = verifyPayload<{ iid?: unknown; bid?: unknown; uid?: unknown; exp?: unknown }>(signed);
  if (!payload) return null;
  const { iid, bid, uid, exp } = payload;
  if (typeof iid !== 'string' || typeof bid !== 'string' || typeof uid !== 'string') return null;
  if (isExpired(exp)) return null;

  // (4) el portador tiene que ser admin AHORA, no cuando se emitió la cookie.
  const actor = await getAdminActor();
  if (!actor) return null;
  if (actor.userId !== uid) return null;

  // (5) la fila es la autoridad.
  const db = createAdminDb(actor);
  const { data, error } = await db
    .from('admin_impersonations')
    .select('id, admin_user_id, business_id, expires_at, ended_at')
    .eq('id', iid)
    .maybeSingle();

  if (error) {
    console.error('[impersonation] fallo al resolver la sesión', error.message);
    return null;
  }
  if (!data) return null;
  if (data.admin_user_id !== actor.userId) return null;
  if (data.business_id !== bid) return null;
  if (data.ended_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  return {
    id: data.id,
    businessId: data.business_id,
    adminUserId: data.admin_user_id,
    adminEmail: actor.email,
    expiresAt: data.expires_at,
  };
}

/** Abre una impersonación y deja la cookie firmada. Queda auditado. */
export async function startImpersonation(
  actor: AdminActor,
  businessId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'failed' }> {
  const db = createAdminDb(actor);

  // El negocio tiene que existir: sin esto se podría abrir una impersonación
  // "fantasma" contra un uuid cualquiera y ensuciar la bitácora.
  const { data: biz } = await db
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .maybeSingle();
  if (!biz) return { ok: false, reason: 'not_found' };

  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MINUTES * 60_000);
  const { data, error } = await db
    .from('admin_impersonations')
    .insert({
      admin_user_id: actor.userId,
      business_id: businessId,
      reason,
      expires_at: expiresAt.toISOString(),
      ip: actor.ip,
      user_agent: actor.userAgent,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[impersonation] no se pudo abrir', error?.message);
    return { ok: false, reason: 'failed' };
  }

  const signed = signPayload({
    iid: data.id,
    bid: businessId,
    uid: actor.userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });
  if (!signed) return { ok: false, reason: 'failed' };

  const jar = await cookies();
  jar.set(IMPERSONATION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  await logAdminAction(actor, {
    action: 'impersonate.start',
    businessId,
    payload: { reason, impersonation_id: data.id, expires_at: expiresAt.toISOString() },
  });

  return { ok: true };
}

/** Cierra la impersonación: marca la fila, limpia la cookie y lo registra. */
export async function endImpersonation(): Promise<void> {
  const jar = await cookies();
  const signed = jar.get(IMPERSONATION_COOKIE)?.value;
  // Se borra siempre, aunque lo demás falle: el usuario tiene que poder salir.
  jar.delete(IMPERSONATION_COOKIE);
  if (!signed) return;

  const payload = verifyPayload<{ iid?: unknown; bid?: unknown }>(signed);
  const actor = await getAdminActor();
  if (!payload || !actor || typeof payload.iid !== 'string') return;

  const db = createAdminDb(actor);
  await db
    .from('admin_impersonations')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', payload.iid)
    .eq('admin_user_id', actor.userId)
    .is('ended_at', null);

  await logAdminAction(actor, {
    action: 'impersonate.end',
    businessId: typeof payload.bid === 'string' ? payload.bid : null,
    payload: { impersonation_id: payload.iid },
  });
}

/**
 * Invariante de solo lectura. La llaman las server actions de ESCRITURA del
 * dashboard: si hay impersonación activa, la mutación se rechaza.
 *
 * Se prefiere esto a "pedir doble confirmación en las acciones peligrosas"
 * porque no depende de clasificar bien cada action: cualquier escritura nueva
 * que alguien agregue mañana queda cubierta por omisión, no por memoria.
 */
export async function assertNotImpersonating(): Promise<void> {
  const active = await getActiveImpersonation();
  if (active) {
    throw new Error(
      'impersonation_read_only: la sesión de soporte es de solo lectura. ' +
        'Salí de la impersonación para operar, o usá las acciones de la ficha del negocio.',
    );
  }
}
