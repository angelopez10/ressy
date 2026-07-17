import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPublicSupabaseEnv } from './env';

/**
 * Cliente de Supabase para Server Components, server actions y route handlers.
 * Va con la publishable key + la sesión del usuario en cookies, así que RLS
 * aplica.
 *
 * CLAUDE.md §3: nunca consultar sin filtrar por tenant, y nunca confiar en un
 * `business_id` que venga del cliente sin validarlo contra la sesión.
 */
export async function createClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` desde un Server Component: lo maneja el middleware al
          // refrescar la sesión. Seguro de ignorar aquí.
        }
      },
    },
  });
}
