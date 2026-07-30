/**
 * Tabla de precios que las RPC de admin reciben como jsonb.
 *
 * Existe para que el MRR se pueda calcular, ORDENAR y SUMAR en SQL sin duplicar
 * los precios en la DB: la fuente de verdad sigue siendo `lib/plans/config.ts`
 * (CLAUDE.md §1 · "nunca hardcodear un precio o límite fuera de la config").
 *
 * Importe MENSUAL: el MRR es una métrica mensual por definición. Un plan anual
 * aporta su equivalente mensual, no el total del año.
 */

import { PLAN_ORDER, priceFor, type PlanId } from '@/lib/plans/config';

export type PriceTable = Record<string, { usd: number; clp: number }>;

export function planPriceTable(): PriceTable {
  const table: PriceTable = {};
  for (const id of PLAN_ORDER) {
    if (id === 'free') continue;
    table[id] = {
      usd: priceFor(id, 'usd', 'monthly'),
      clp: priceFor(id, 'clp', 'monthly'),
    };
  }
  return table;
}

/**
 * MRR de un negocio en SU moneda. Espeja la lógica de las RPC para que la UI
 * pueda recalcular sin otra vuelta a la DB.
 */
export function mrrFor(
  tier: PlanId | string,
  currency: string,
  status: string,
  isTrial: boolean,
): number {
  if (tier === 'free' || isTrial) return 0;
  if (status !== 'active' && status !== 'past_due') return 0;
  const table = planPriceTable();
  const row = table[tier];
  if (!row) return 0;
  return currency.toLowerCase() === 'clp' ? row.clp : row.usd;
}
