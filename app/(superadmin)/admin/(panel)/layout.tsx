import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAdminActor, getAdminIdentity } from '@/lib/admin/guard';

/**
 * Nada del panel se prerenderiza ni se cachea, NUNCA.
 *
 * Sin esto Next puede marcar estas rutas como estáticas: cuando el panel está
 * apagado (sin `RESSY_ADMIN_SECRET`) el guard corta antes de leer cookies, no
 * se toca ninguna API dinámica, y el resultado se prerenderiza. Hoy eso da un
 * 404 inofensivo, pero dejar que el modo de render de una superficie de admin
 * dependa de si el guard alcanzó a leer una cookie es demasiado frágil para
 * algo que expone datos de todos los negocios.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Guard del panel. Distingue dos negativas a propósito:
 *
 *  - NO sos staff de Ressy → 404 (`notFound`, vía la ausencia de identidad).
 *    Un 403 confirmaría que la ruta existe; para el resto del mundo el panel
 *    simplemente no está.
 *  - SOS staff pero no superaste el OTP → redirect a /admin/acceso. Acá sí
 *    conviene ser explícito: ya sabemos quién sos.
 *
 * ⚠️ Este layout NO es la barrera. En Next las server actions son endpoints
 * POST direccionables por sí mismos y no pasan por acá: la barrera real es
 * `requireAdmin()` al principio de cada action (lib/admin/actions.ts).
 */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const actor = await getAdminActor();
  if (actor) return <>{children}</>;

  // Sin actor: ¿es falta de elevación o directamente no es admin?
  const identity = await getAdminIdentity();
  if (identity) redirect('/admin/acceso');

  // No es staff de Ressy (o el panel no está configurado): el panel no existe.
  const { notFound } = await import('next/navigation');
  notFound();
}
