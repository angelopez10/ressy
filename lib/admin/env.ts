/**
 * ============================================================================
 * Ressy — Configuración del panel de Super Admin
 * ============================================================================
 * Ninguna de estas es `NEXT_PUBLIC_`: son secretos de servidor (CLAUDE.md §9).
 *
 * Failsafe deliberado: si falta `RESSY_ADMIN_SECRET`, el panel queda APAGADO
 * para todo el mundo (404). Preferimos que el panel no exista a que exista sin
 * poder firmar cookies de sesión ni hashear los códigos OTP.
 * ============================================================================
 */

/**
 * Pepper + clave de firma de las cookies de admin (sesión elevada e
 * impersonación) y de los hashes de OTP. 32+ bytes aleatorios.
 */
export function getAdminSecret(): string | null {
  const raw = process.env.RESSY_ADMIN_SECRET;
  if (!raw || raw.length < 32) return null;
  return raw;
}

/** ¿El panel está habilitado en este ambiente? */
export function isAdminConfigured(): boolean {
  return getAdminSecret() !== null;
}

/**
 * Allowlist opcional de emails. Segundo factor de AUTORIZACIÓN: cuando está
 * seteada, hay que estar en `ressy_admins` Y en esta lista. Así una escritura
 * maliciosa en la DB, por sí sola, no otorga acceso al panel.
 *
 * Vacía/ausente ⇒ manda solo la tabla (cómodo en dev; en prod: setearla).
 */
export function getAdminEmailAllowlist(): string[] | null {
  const raw = process.env.RESSY_ADMIN_EMAILS;
  if (!raw || !raw.trim()) return null;
  const list = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

/** ¿Este email pasa la allowlist? Sin allowlist configurada, pasa. */
export function isEmailAllowlisted(email: string): boolean {
  const list = getAdminEmailAllowlist();
  if (!list) return true;
  return list.includes(email.trim().toLowerCase());
}

/** Duración de la elevación tras superar el OTP. */
export const ADMIN_SESSION_TTL_MINUTES = 8 * 60;

/** Vida del desafío OTP. Corta a propósito. */
export const ADMIN_OTP_TTL_MINUTES = 10;

/** Intentos por desafío antes de invalidarlo. */
export const ADMIN_OTP_MAX_ATTEMPTS = 5;

/** Vida de una sesión de impersonación. Corta: es una ventana de soporte. */
export const IMPERSONATION_TTL_MINUTES = 30;

export const ADMIN_SESSION_COOKIE = 'ressy_admin_session';
export const IMPERSONATION_COOKIE = 'ressy_impersonation';

/**
 * Tipo de cambio para el total de MRR en USD. Ressy NO convierte monedas
 * (CLAUDE.md §3): esto existe solo para la cifra de cabecera interna del panel,
 * y la UI la muestra siempre etiquetada como aproximada.
 */
export function getUsdPerClp(): number {
  const raw = Number(process.env.RESSY_USD_PER_CLP);
  return Number.isFinite(raw) && raw > 0 ? raw : 0.00104;
}
