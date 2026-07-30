/**
 * Tipos y constantes del panel que necesitan CLIENTE y servidor.
 *
 * Existe para no arrastrar `lib/admin/queries.ts` (que es `server-only`, y por
 * ahí cuelga el cliente con service role) dentro de un bundle de cliente solo
 * por importar una etiqueta o un tipo. Si un componente `"use client"` necesita
 * algo del panel, va acá.
 *
 * Regla: este archivo NO importa nada de servidor. Nunca.
 */

export type RangeKey = '7d' | '30d' | '90d' | '12m';

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '12m', label: '12 meses' },
];

export function isRangeKey(value: unknown): value is RangeKey {
  return typeof value === 'string' && RANGES.some((r) => r.key === value);
}

export function rangeToDates(key: RangeKey): { from: Date; to: Date; days: number } {
  const days = key === '7d' ? 7 : key === '30d' ? 30 : key === '90d' ? 90 : 365;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from, to, days };
}

/** Estado operativo en el vocabulario del panel (no el enum de Stripe). */
export type BusinessState = 'activo' | 'trial' | 'gracia' | 'free' | 'cancelado' | 'suspendido';

export type Health = 'sano' | 'riesgo' | 'inactivo';

export type SortKey = 'name' | 'created' | 'activity' | 'bookings' | 'mrr';
