import 'server-only';

/**
 * ============================================================================
 * Ressy — Cliente elevado del panel de Super Admin
 * ============================================================================
 * El admin lee datos CROSS-TENANT a propósito (es la única excepción del
 * sistema), así que sus queries corren con service role y bypassean RLS.
 * Justamente por eso este módulo existe: para que no haya forma de obtener ese
 * cliente sin haber pasado antes por el guard.
 *
 * `createAdminDb` EXIGE un `AdminActor`, y un `AdminActor` solo lo produce
 * `requireAdmin()` tras verificar identidad + elevación contra la DB. El tipo
 * es la barrera: no se puede "olvidar" el chequeo, porque sin el objeto no
 * compila.
 *
 * Regla de oro (CLAUDE.md §9): cualquier query con service role FUERA del
 * contexto verificado de admin es un agujero de seguridad.
 *   - jobs de Inngest y webhooks  → `lib/db/service.ts`
 *   - panel de admin              → este módulo
 *   - todo lo demás               → `lib/db/server.ts` (respeta RLS)
 * ============================================================================
 */

import { createServiceClient, type ServiceClient } from '@/lib/db/service';
import type { AdminActor } from './guard';

/**
 * Cliente elevado para el panel. El `actor` no se usa en el cuerpo: está en la
 * firma para que sea imposible construir el cliente sin haber pasado el guard.
 */
export function createAdminDb(actor: AdminActor): ServiceClient {
  if (!actor?.userId || !actor?.sessionId) {
    // Defensa contra un `as AdminActor` a mano en algún call site.
    throw new Error('createAdminDb requiere un AdminActor verificado por requireAdmin().');
  }
  return createServiceClient();
}

/**
 * @internal Cliente para resolver la IDENTIDAD del admin (leer `ressy_admins`,
 * `admin_sessions`), que están en RLS deny-all y por eso no se pueden consultar
 * con el cliente de usuario. Lo usa SOLO `guard.ts`: es el paso previo a que
 * exista un actor. No importar desde ningún otro lado.
 */
export function createAdminLookupClient(): ServiceClient {
  return createServiceClient();
}
