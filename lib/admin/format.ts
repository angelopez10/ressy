/**
 * Formato y vocabulario visual del panel de admin.
 *
 * Los colores de estado y salud vienen del mockup del Super Admin y se apoyan
 * en los tokens de Ressy (CLAUDE.md §5). Los planes usan una paleta propia de
 * categoría —igual que el mockup— porque acá sirven para distinguir de un
 * vistazo, no para expresar la marca.
 *
 * Panel interno ⇒ todo en español, sin i18n (CLAUDE.md · sesión 13).
 */

import type { BusinessState, Health } from './shared';

export const STATE_LABEL: Record<BusinessState, string> = {
  activo: 'Activo',
  trial: 'Trial',
  gracia: 'En gracia',
  free: 'Free',
  cancelado: 'Cancelado',
  suspendido: 'Suspendido',
};

export const STATE_COLOR: Record<BusinessState, string> = {
  activo: '#008A05',
  trial: '#348D83',
  gracia: '#B45309',
  free: '#6A6A6A',
  cancelado: '#C13515',
  suspendido: '#C13515',
};

export const HEALTH_LABEL: Record<Health, string> = {
  sano: 'Sano',
  riesgo: 'En riesgo',
  inactivo: 'Inactivo',
};

export const HEALTH_COLOR: Record<Health, string> = {
  sano: '#008A05',
  riesgo: '#B45309',
  inactivo: '#B0B0B0',
};

export const PLAN_COLOR: Record<string, string> = {
  free: '#6A6A6A',
  solo: '#3B6FB0',
  team: '#6D4AB0',
  studio: '#B08A00',
};

export const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  solo: 'Solo',
  team: 'Team',
  studio: 'Studio',
};

/** Estilo de píldora tintada sobre su propio color (patrón del mockup). */
export function pill(color: string): React.CSSProperties {
  return { color, backgroundColor: `${color}18` };
}

/**
 * Monto en la moneda del negocio. `Intl.NumberFormat` con la moneda real
 * (CLAUDE.md §6): Ressy no convierte, solo muestra en la moneda de cada uno.
 */
export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: currency.toUpperCase() === 'CLP' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Monto en la unidad MENOR (los pagos se guardan así · CLAUDE.md §3). */
export function moneyMinor(amountMinor: number, currency: string): string {
  const isZeroDecimal = ['CLP', 'JPY', 'KRW'].includes(currency.toUpperCase());
  return money(isZeroDecimal ? amountMinor : amountMinor / 100, currency);
}

export function usd(amount: number): string {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function pct(value: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

const dateFmt = new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateFmt.format(new Date(iso));
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dateTimeFmt.format(new Date(iso));
}

/** "hace 2 h", "ayer", "hace 12 d". Para la columna de última actividad. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'en el futuro';
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return months < 12 ? `hace ${months} m` : `hace ${Math.floor(months / 12)} a`;
}

/** Etiquetas legibles de las acciones del audit log. */
export const ACTION_LABEL: Record<string, string> = {
  'admin.step_up': 'Entró al panel',
  'admin.step_up_failed': 'Código de acceso fallido',
  'admin.sign_out': 'Cerró el panel',
  'impersonate.start': 'Inició impersonación',
  'impersonate.end': 'Terminó impersonación',
  'trial.extend': 'Extendió el trial',
  'plan.change': 'Cambió el plan',
  'business.suspend': 'Suspendió la cuenta',
  'business.unsuspend': 'Reactivó la cuenta',
  'subscription.cancel': 'Canceló la suscripción',
  'admin.grant': 'Otorgó acceso de admin',
  'admin.revoke': 'Revocó acceso de admin',
};

/** Acciones que cambian algo. Se marcan distinto del simple "entró y miró". */
export const SENSITIVE_ACTIONS = new Set([
  'impersonate.start',
  'trial.extend',
  'plan.change',
  'business.suspend',
  'business.unsuspend',
  'subscription.cancel',
  'admin.grant',
  'admin.revoke',
]);
