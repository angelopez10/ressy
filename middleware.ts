import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { getPublicSupabaseEnv } from '@/lib/db/env';
import { routing } from '@/lib/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/** Locale del primer segmento de la ruta; cae al default si no es uno soportado. */
function localeFromPath(pathname: string): string {
  const seg = pathname.split('/')[1] ?? '';
  return (routing.locales as readonly string[]).includes(seg) ? seg : routing.defaultLocale;
}

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
  // Red de seguridad para el callback de auth. Si un `code` de Supabase aterriza
  // en una ruta de página (p. ej. `/es?code=...`) en vez de en `/api/auth/callback`,
  // significa que Supabase cayó al Site URL por defecto en lugar de a nuestro
  // `emailRedirectTo`. Sin esto el code queda colgado en la URL y el login nunca
  // se completa. Lo reenviamos al handler que canjea el code por sesión.
  //
  // El arreglo de fondo es alinear las Redirect URLs en el panel de Supabase; esto
  // es solo defensa en profundidad para no dejar al usuario sin sesión.
  const authCode = request.nextUrl.searchParams.get('code');
  if (authCode && !request.nextUrl.pathname.startsWith('/api/')) {
    const callback = request.nextUrl.clone();
    callback.pathname = '/api/auth/callback';
    callback.search = '';
    callback.searchParams.set('code', authCode);
    callback.searchParams.set('next', `/${localeFromPath(request.nextUrl.pathname)}/onboarding`);
    return NextResponse.redirect(callback);
  }

  // El panel de Super Admin vive FUERA de `[locale]`: es solo para el equipo de
  // Ressy y no lleva i18n. Si pasara por next-intl, `/admin` se redirigiría a
  // `/es/admin` y la ruta no existiría. Igual necesita el refresco de sesión de
  // abajo, así que solo se saltea el middleware de intl.
  //
  // Esto NO es el guard: quién puede entrar lo decide `requireAdmin()` en el
  // layout y en cada server action (lib/admin/guard.ts). El middleware corre en
  // edge y nunca es la única línea de defensa (CLAUDE.md §9).
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  const response = isAdminRoute ? NextResponse.next({ request }) : intlMiddleware(request);

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
