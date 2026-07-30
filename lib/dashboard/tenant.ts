import 'server-only';

/**
 * ============================================================================
 * Ressy — Resolución del tenant del dashboard
 * ============================================================================
 * Punto único donde se decide CON QUÉ CLIENTE y SOBRE QUÉ NEGOCIO trabaja el
 * dashboard. Existe por la impersonación de soporte: un admin de Ressy no es
 * miembro del negocio, así que con el cliente de RLS no vería nada.
 *
 * Dos caminos, y solo dos:
 *
 *   - Normal (el 100% de los negocios reales): cliente de RLS. La base de datos
 *     acota lo que se ve, como siempre.
 *   - Impersonando: cliente elevado, pero SOLO después de que
 *     `getActiveImpersonation()` haya verificado firma + admin vigente +
 *     elevación OTP + fila viva. Ver `lib/admin/impersonation.ts`.
 *
 * ⚠️ Regla que vuelve segura esta pieza: con el cliente elevado NO hay red de
 * seguridad de RLS, así que TODA query del dashboard filtra por `business_id`
 * de forma explícita (CLAUDE.md §3). Para un usuario normal ese filtro es
 * redundante —RLS ya limitó las filas a su tenant—, o sea que agregarlo no
 * cambia ningún resultado existente; es justo lo que permite que el mismo
 * código sirva para los dos caminos.
 * ============================================================================
 */

import { createServiceClient, type ServiceClient } from '@/lib/db/service';
import { createClient } from '@/lib/db/server';
import { getActiveImpersonation, type ActiveImpersonation } from '@/lib/admin/impersonation';

/** Cualquiera de los dos clientes. Mismo patrón que `lib/plans/status.ts`. */
export type TenantDb = ServiceClient | Awaited<ReturnType<typeof createClient>>;

/**
 * Cliente para LEER datos del negocio actual. Devuelve el elevado solo bajo una
 * impersonación verificada.
 *
 * Las ESCRITURAS no usan esto: siguen con `createClient()` (RLS) y además
 * llaman a `assertNotImpersonating()`. La impersonación es de solo lectura.
 */
export async function getTenantDb(): Promise<TenantDb> {
  const impersonation = await getActiveImpersonation();
  if (impersonation) return createServiceClient();
  return createClient();
}

/**
 * Negocio sobre el que opera el dashboard: el impersonado si hay sesión de
 * soporte, o el del usuario (vía RLS) si no.
 */
export async function resolveTenant(): Promise<{
  businessId: string;
  db: TenantDb;
  impersonation: ActiveImpersonation | null;
} | null> {
  const impersonation = await getActiveImpersonation();

  if (impersonation) {
    return { businessId: impersonation.businessId, db: createServiceClient(), impersonation };
  }

  const db = await createClient();
  // Sin impersonación manda RLS: este select ya viene acotado a los negocios
  // donde el usuario es miembro.
  const { data } = await db
    .from('businesses')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { businessId: data.id, db, impersonation: null };
}
