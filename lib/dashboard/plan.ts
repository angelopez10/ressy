import type { Enums } from '@/lib/db/types';

/**
 * Límite de staff activo por tier (CLAUDE.md §1). Cliente-seguro (sin
 * `server-only`): lo consumen tanto server components como la UI del plan. Debe
 * coincidir con `staff_limit_for_tier` en la DB (migración 10).
 */
export const STAFF_LIMIT: Record<Enums<'subscription_tier'>, number> = {
  free: 1,
  starter: 1,
  pro: 5,
  business: 15,
};
