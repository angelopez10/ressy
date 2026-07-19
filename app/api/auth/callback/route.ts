import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';

/**
 * Callback de auth: tanto el magic link como el OAuth de Google terminan aquí con
 * un `code` en la query. Lo canjeamos por una sesión (se escriben las cookies) y
 * mandamos al usuario a `next` (por defecto el onboarding).
 *
 * Vive bajo `/api` a propósito: así el matcher del middleware de next-intl lo
 * ignora y no le mete prefijo de locale a la URL del callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/es/login?error=auth`);
}

/** Solo rutas internas relativas: nunca redirigir a un host externo (open redirect). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/es/onboarding';
}
