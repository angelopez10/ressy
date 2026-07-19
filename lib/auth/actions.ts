'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/db/server';

const emailSchema = z.email();

/** Origen del sitio desde los headers (respeta proxy de Vercel). Para redirectTo. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function callbackUrl(origin: string, nextPath: string): string {
  return `${origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export type EmailAuthResult = { ok: true } | { ok: false; error: 'invalidEmail' | 'sendFailed' };

/**
 * Magic link por email. No crea sesión aquí: manda el correo con un link a
 * `/api/auth/callback`, que es donde se canjea el código por sesión.
 */
export async function signInWithEmail(email: string, nextPath: string): Promise<EmailAuthResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: 'invalidEmail' };

  const db = await createClient();
  const origin = await siteOrigin();
  const { error } = await db.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: callbackUrl(origin, nextPath) },
  });
  if (error) return { ok: false, error: 'sendFailed' };
  return { ok: true };
}

/**
 * OAuth de Google. Devuelve (vía redirect) al usuario a la pantalla de consentimiento
 * de Google; al volver, `/api/auth/callback` canjea el código.
 *
 * NOTA: requiere tener el proveedor Google habilitado en el panel de Supabase
 * (Auth → Providers) con su client id/secret. Sin eso, este redirect falla.
 */
export async function signInWithGoogle(nextPath: string): Promise<void> {
  const db = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(origin, nextPath) },
  });
  if (error || !data.url) {
    redirect(`/login?error=oauth`);
  }
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const db = await createClient();
  await db.auth.signOut();
  redirect('/login');
}
