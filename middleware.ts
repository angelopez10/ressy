import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { getPublicSupabaseEnv } from '@/lib/db/env';
import { routing } from '@/lib/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Middleware compuesto: next-intl (prefijo de locale) + refresco de la sesión de
 * Supabase. Hay que colgar las cookies refrescadas de Supabase sobre la respuesta
 * que devuelve next-intl; si no, la sesión se pierde entre requests.
 *
 * Este middleware NO decide rutas protegidas: solo mantiene viva la sesión. Los
 * guards (login requerido, onboarding vs dashboard) viven en los Server
 * Components con `getUser()`, que es la fuente confiable — el middleware corre en
 * edge y no debe ser la única línea de defensa (CLAUDE.md §9).
 */
export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const { url, publishableKey } = getPublicSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Fuerza el refresco del token si expiró; escribe las cookies nuevas en `response`.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Matchea todo salvo los internos de Next, la API y archivos con extensión.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
