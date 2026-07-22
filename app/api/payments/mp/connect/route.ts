import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getPaymentProvider } from '@/lib/payments';
import { buildAuthorizeUrl, createPkce, randomState } from '@/lib/payments/mercadopago/oauth';
import { canUseFeature } from '@/lib/plans/config';

/**
 * Inicia el flujo OAuth de Mercado Pago para el negocio del usuario.
 * Guarda `state` (CSRF) + `code_verifier` (PKCE) + `business_id` en cookies
 * httpOnly de vida corta, y redirige al negocio a autorizar en MP.
 *
 * Bajo `/api` para que el middleware de next-intl lo ignore (sin prefijo locale).
 */
export async function GET() {
  const ctx = await getDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) {
    return NextResponse.redirect(url('/es/login'));
  }
  // Anticipos = feature de planes pagos (Free bloqueado).
  if (!canUseFeature(ctx.tier, 'deposits')) {
    return NextResponse.redirect(url('/es/dashboard/settings?tab=payments&mp=plan'));
  }
  if (!getPaymentProvider().isConfigured()) {
    return NextResponse.redirect(url('/es/dashboard/settings?tab=payments&mp=unconfigured'));
  }

  const state = randomState();
  const { verifier, challenge } = createPkce();

  const jar = await cookies();
  const opts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/api/payments/mp', maxAge: 600 };
  jar.set('mp_oauth_state', state, opts);
  jar.set('mp_oauth_verifier', verifier, opts);
  jar.set('mp_oauth_business', ctx.business.id, opts);

  return NextResponse.redirect(buildAuthorizeUrl(state, challenge));
}

function url(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}${path}`;
}
