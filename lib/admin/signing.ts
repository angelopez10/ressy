import 'server-only';

/**
 * ============================================================================
 * Ressy — Firma de cookies del panel de admin (HMAC-SHA256)
 * ============================================================================
 * Las cookies de admin (sesión elevada, impersonación) llevan un identificador
 * y un vencimiento. Se firman para que un valor manipulado no llegue nunca a
 * tocar la DB: la verificación falla antes.
 *
 * La firma NO es la autorización. Una cookie con firma válida solo dice "esto
 * lo emitimos nosotros y no fue alterado"; quién sos y si podés seguir sigue
 * decidiéndolo la DB (`ressy_admins`, `admin_sessions`) en cada request. La
 * firma evita el sondeo, la DB decide el acceso.
 *
 * Formato: `<payload_b64url>.<sig_b64url>`.
 * ============================================================================
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAdminSecret } from './env';

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function hmac(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

/**
 * Firma un objeto serializable. Devuelve null si el panel no está configurado
 * (sin secreto no se emite nada; ver `env.ts`).
 */
export function signPayload(value: Record<string, unknown>): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;
  const payload = b64url(Buffer.from(JSON.stringify(value), 'utf8'));
  return `${payload}.${hmac(payload, secret)}`;
}

/**
 * Verifica y decodifica. Devuelve null ante CUALQUIER anomalía —formato,
 * firma, JSON inválido— sin distinguir el motivo: un atacante no debe poder
 * usar el error para aprender nada.
 *
 * La comparación es de tiempo constante para no filtrar la firma por timing.
 */
export function verifyPayload<T = Record<string, unknown>>(signed: string | undefined): T | null {
  const secret = getAdminSecret();
  if (!secret || !signed) return null;

  const dot = signed.lastIndexOf('.');
  if (dot <= 0 || dot === signed.length - 1) return null;

  const payload = signed.slice(0, dot);
  const provided = signed.slice(dot + 1);
  const expected = hmac(payload, secret);

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // timingSafeEqual exige mismo largo; distinto largo ⇒ firma inválida.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(fromB64url(payload).toString('utf8')) as T;
  } catch {
    return null;
  }
}

/** ¿Venció? `exp` en segundos epoch. Sin `exp` válido se considera vencido. */
export function isExpired(exp: unknown, now = Date.now()): boolean {
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return true;
  return exp * 1000 <= now;
}

/**
 * Hash del código OTP. Nunca se guarda el código en claro: con el pepper de
 * servidor, un dump de la DB no permite verificar códigos offline.
 */
export function hashOtp(code: string): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(`otp:${code}`).digest('hex');
}
