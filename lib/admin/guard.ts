import 'server-only';

/**
 * ============================================================================
 * Ressy — LA barrera de autorización del panel de Super Admin
 * ============================================================================
 * Este archivo es el punto más sensible del sistema: detrás suyo hay acceso
 * cross-tenant a los datos de TODOS los negocios.
 *
 * Cuatro condiciones, TODAS obligatorias, verificadas server-side en CADA
 * request:
 *
 *   1. Panel configurado    → sin `RESSY_ADMIN_SECRET` el panel no existe (404).
 *   2. Sesión de Supabase   → `getUser()`, que valida el JWT contra Supabase.
 *   3. Fila en `ressy_admins` vigente (`revoked_at is null`). La tabla está en
 *      RLS deny-all, así que se lee con el cliente de lookup elevado.
 *   4. Allowlist de email (si `RESSY_ADMIN_EMAILS` está seteada) + elevación
 *      vigente en `admin_sessions` (el step-up con OTP).
 *
 * Dónde se llama — en TRES capas, no en una:
 *   - `app/(superadmin)/layout.tsx`, para no renderizar nada.
 *   - Al principio de CADA server action y route handler de admin. Ésta es la
 *     barrera real: en Next las server actions son endpoints POST direccionables
 *     por sí mismos, así que un layout NO es un límite de seguridad.
 *   - `createAdminDb(actor)`, que exige el actor por tipo.
 *
 * Por qué 404 y no 403: un 403 confirma que la ruta existe. Para quien no es
 * staff de Ressy, el panel simplemente no está.
 * ============================================================================
 */

import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { createAdminLookupClient } from './db';
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isEmailAllowlisted } from './env';
import { isExpired, verifyPayload } from './signing';

export type AdminRole = 'owner' | 'support';

/** Quién es, sin decir nada sobre la elevación. */
export interface AdminIdentity {
  userId: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

/** Identidad + elevación vigente. Es lo que habilita el cliente elevado. */
export interface AdminActor extends AdminIdentity {
  /** Fila de `admin_sessions` que sostiene esta elevación. */
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
}

/** Contexto del request para la bitácora. */
export async function getRequestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  // Vercel/proxies: el primer valor de x-forwarded-for es el cliente real.
  const forwarded = h.get('x-forwarded-for');
  const ip = forwarded ? (forwarded.split(',')[0]?.trim() ?? null) : h.get('x-real-ip');
  return { ip: ip || null, userAgent: h.get('user-agent') };
}

/**
 * Paso 1-3: ¿este usuario es staff de Ressy? NO valida la elevación, así que
 * solo sirve para el propio flujo de step-up (`/admin/verify`). Cualquier otra
 * cosa usa `requireAdmin()`.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (!isAdminConfigured()) return null;

  const user = await getUser();
  if (!user?.email) return null;

  const db = createAdminLookupClient();
  const { data, error } = await db
    .from('ressy_admins')
    .select('user_id, email, name, role, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    // Nunca tragar en silencio (CLAUDE.md §6), pero sin filtrar quién intentó.
    console.error('[admin-guard] fallo al resolver identidad', error.message);
    return null;
  }
  if (!data) return null;

  // Segundo factor de autorización: la tabla no alcanza si hay allowlist.
  if (!isEmailAllowlisted(user.email)) {
    console.warn('[admin-guard] usuario en ressy_admins pero fuera de la allowlist');
    return null;
  }

  return {
    userId: data.user_id,
    email: user.email,
    name: data.name,
    role: data.role,
  };
}

/**
 * Identidad + elevación. La cookie firmada solo aporta un id no manipulable;
 * quien decide si la sesión sigue viva es la FILA en `admin_sessions`, para que
 * revocar corte el acceso al instante sin esperar a que la cookie expire.
 */
export async function getAdminActor(): Promise<AdminActor | null> {
  const identity = await getAdminIdentity();
  if (!identity) return null;

  const jar = await cookies();
  const signed = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const payload = verifyPayload<{ sid?: unknown; uid?: unknown; exp?: unknown }>(signed);
  if (!payload) return null;

  const { sid, uid, exp } = payload;
  if (typeof sid !== 'string' || typeof uid !== 'string') return null;
  // La cookie tiene que ser del MISMO usuario que la sesión de Supabase: si no,
  // una cookie válida robada de otro admin serviría con la sesión propia.
  if (uid !== identity.userId) return null;
  if (isExpired(exp)) return null;

  const db = createAdminLookupClient();
  const { data, error } = await db
    .from('admin_sessions')
    .select('id, user_id, expires_at, revoked_at')
    .eq('id', sid)
    .maybeSingle();

  if (error) {
    console.error('[admin-guard] fallo al resolver la sesión elevada', error.message);
    return null;
  }
  if (!data) return null;
  if (data.user_id !== identity.userId) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  const { ip, userAgent } = await getRequestContext();
  return { ...identity, sessionId: data.id, ip, userAgent };
}

/**
 * La forma que usa TODO el panel. No devuelve nunca cuando falla: llama a
 * `notFound()`, así ningún call site puede seguir de largo por accidente.
 */
export async function requireAdmin(): Promise<AdminActor> {
  const actor = await getAdminActor();
  if (!actor) notFound();
  return actor;
}

/**
 * Para acciones destructivas o de dinero: exige rol `owner`. Soporte puede
 * mirar y hacer concesiones blandas, no suspender ni cancelar.
 */
export async function requireAdminRole(role: AdminRole): Promise<AdminActor> {
  const actor = await requireAdmin();
  if (role === 'owner' && actor.role !== 'owner') notFound();
  return actor;
}

/** Solo identidad (paso previo al OTP). Falla igual con 404. */
export async function requireAdminIdentity(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) notFound();
  return identity;
}
