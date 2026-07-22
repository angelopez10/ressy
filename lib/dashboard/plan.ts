import { getLimit } from '@/lib/plans/config';
import type { PlanId } from '@/lib/plans/config';
import type { Enums } from '@/lib/db/types';

/**
 * Compat: el límite de staff por tier ahora vive en la fuente de verdad única
 * (`lib/plans/config.ts`). Este objeto se deriva de ahí para no duplicar el mapa
 * y no romper los imports existentes. Debe coincidir con `staff_limit_for_tier`
 * en la DB (migración 13). Prefiere `getLimit(tier, 'staff')` en código nuevo.
 */
export const STAFF_LIMIT: Record<Enums<'subscription_tier'>, number> = {
  free: getLimit('free', 'staff'),
  solo: getLimit('solo', 'staff'),
  team: getLimit('team', 'staff'),
  studio: getLimit('studio', 'staff'),
};

/** El tier de la DB es exactamente el `PlanId` de la config. Alias para claridad. */
export type Tier = PlanId;
