import 'server-only';

/**
 * ============================================================================
 * Ressy — Step-up del panel de admin (OTP por email)
 * ============================================================================
 * Tener sesión de Supabase NO alcanza para entrar. Estar en `ressy_admins`
 * tampoco. Además hay que superar un desafío de un solo uso enviado al email
 * del admin, que produce una ELEVACIÓN con vencimiento.
 *
 * Por qué: la sesión de Supabase es una cookie de larga vida que también sirve
 * para el dashboard normal. Si esa cookie se filtra, el atacante entra al
 * dashboard del atacado — malo, pero acotado. Sin step-up entraría además a los
 * datos de TODOS los negocios. La elevación corta ese salto.
 *
 * Decisiones:
 *  - El código va HASHEADO con pepper de servidor: un dump de la DB no permite
 *    verificarlo offline.
 *  - Intentos acotados por desafío, y un solo desafío vivo por usuario.
 *  - La FILA de `admin_sessions` manda sobre la cookie: revocarla corta el
 *    acceso al instante.
 *  - `method` en la fila deja el hueco para pasar a TOTP sin migración.
 * ============================================================================
 */

import { randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { ResendEmailChannel } from '@/lib/notifications/channels/email.resend';
import { logPreElevationEvent } from './audit';
import { createAdminLookupClient } from './db';
import {
  ADMIN_OTP_MAX_ATTEMPTS,
  ADMIN_OTP_TTL_MINUTES,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MINUTES,
} from './env';
import type { AdminActor, AdminIdentity } from './guard';
import { getRequestContext } from './guard';
import { hashOtp, signPayload } from './signing';

/** Segundos mínimos entre reenvíos, para que el buzón no sea un canal de spam. */
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  // randomInt es CSPRNG; Math.random no sirve para un factor de autenticación.
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export type StartChallengeResult =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: 'cooldown' | 'not_configured' | 'email_failed' };

/**
 * Crea (o reusa el cooldown de) un desafío y manda el código por email.
 * El código NO se devuelve ni se loguea jamás.
 */
export async function startOtpChallenge(identity: AdminIdentity): Promise<StartChallengeResult> {
  const db = createAdminLookupClient();
  const { ip, userAgent } = await getRequestContext();

  // Cooldown: mirar el último desafío del usuario.
  const { data: last } = await db
    .from('admin_otp_challenges')
    .select('created_at')
    .eq('user_id', identity.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) return { ok: false, reason: 'cooldown' };
  }

  const code = generateCode();
  const codeHash = hashOtp(code);
  if (!codeHash) return { ok: false, reason: 'not_configured' };

  const expiresAt = new Date(Date.now() + ADMIN_OTP_TTL_MINUTES * 60_000).toISOString();

  // Un solo desafío vivo: los anteriores se queman antes de emitir el nuevo.
  await db
    .from('admin_otp_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', identity.userId)
    .is('consumed_at', null);

  const { error } = await db.from('admin_otp_challenges').insert({
    user_id: identity.userId,
    code_hash: codeHash,
    expires_at: expiresAt,
    ip,
    user_agent: userAgent,
  });
  if (error) {
    console.error('[admin-otp] no se pudo crear el desafío', error.message);
    return { ok: false, reason: 'not_configured' };
  }

  const email = new ResendEmailChannel();
  if (!email.isConfigured()) {
    console.error('[admin-otp] Resend no está configurado: no se puede completar el step-up');
    return { ok: false, reason: 'email_failed' };
  }

  const sent = await email.send({
    to: identity.email,
    subject: `Ressy Admin · tu código es ${code}`,
    text: [
      `Código de acceso al panel interno de Ressy: ${code}`,
      '',
      `Vence en ${ADMIN_OTP_TTL_MINUTES} minutos y sirve una sola vez.`,
      'Si no fuiste vos, alguien tiene tu sesión de Ressy: avisá al equipo ahora.',
    ].join('\n'),
  });

  if (!sent.ok) {
    console.error('[admin-otp] fallo el envío del código', sent.error);
    return { ok: false, reason: 'email_failed' };
  }

  return { ok: true, expiresAt };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' | 'not_configured' };

/**
 * Verifica el código y, si es correcto, crea la sesión elevada + la cookie.
 * Cualquier fallo devuelve un motivo genérico hacia la UI: no se distingue
 * "código incorrecto" de "no había desafío".
 */
export async function verifyOtpAndElevate(identity: AdminIdentity, code: string): Promise<VerifyResult> {
  const db = createAdminLookupClient();
  const { ip, userAgent } = await getRequestContext();

  const provided = hashOtp(code.trim());
  if (!provided) return { ok: false, reason: 'not_configured' };

  const { data: challenge } = await db
    .from('admin_otp_challenges')
    .select('id, code_hash, attempts, expires_at, consumed_at')
    .eq('user_id', identity.userId)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) return { ok: false, reason: 'invalid' };

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await db
      .from('admin_otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id);
    return { ok: false, reason: 'expired' };
  }

  if (challenge.attempts >= ADMIN_OTP_MAX_ATTEMPTS) {
    await db
      .from('admin_otp_challenges')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', challenge.id);
    await logPreElevationEvent({
      userId: identity.userId,
      email: identity.email,
      action: 'admin.step_up_failed',
      payload: { reason: 'too_many_attempts' },
      ip,
      userAgent,
    });
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (challenge.code_hash !== provided) {
    await db
      .from('admin_otp_challenges')
      .update({ attempts: challenge.attempts + 1 })
      .eq('id', challenge.id);
    await logPreElevationEvent({
      userId: identity.userId,
      email: identity.email,
      action: 'admin.step_up_failed',
      payload: { reason: 'bad_code', attempt: challenge.attempts + 1 },
      ip,
      userAgent,
    });
    return { ok: false, reason: 'invalid' };
  }

  // Correcto: quemar el desafío y abrir la elevación.
  await db
    .from('admin_otp_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', challenge.id);

  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MINUTES * 60_000);
  const { data: session, error } = await db
    .from('admin_sessions')
    .insert({
      user_id: identity.userId,
      method: 'email_otp',
      expires_at: expiresAt.toISOString(),
      ip,
      user_agent: userAgent,
    })
    .select('id')
    .single();

  if (error || !session) {
    console.error('[admin-otp] no se pudo crear la sesión elevada', error?.message);
    return { ok: false, reason: 'not_configured' };
  }

  const signed = signPayload({
    sid: session.id,
    uid: identity.userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });
  if (!signed) return { ok: false, reason: 'not_configured' };

  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  await logPreElevationEvent({
    userId: identity.userId,
    email: identity.email,
    action: 'admin.step_up',
    payload: { method: 'email_otp' },
    ip,
    userAgent,
  });

  return { ok: true };
}

/** Cierra la elevación: revoca la fila (autoridad) y limpia la cookie. */
export async function endAdminSession(actor: AdminActor): Promise<void> {
  const db = createAdminLookupClient();
  await db
    .from('admin_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', actor.sessionId);

  const jar = await cookies();
  jar.delete(ADMIN_SESSION_COOKIE);
}
