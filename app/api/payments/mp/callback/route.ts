import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDashboardContext } from '@/lib/dashboard/context';
import { createServiceClient } from '@/lib/db/service';
import { exchangeCode } from '@/lib/payments/mercadopago/oauth';
import { saveTokens } from '@/lib/payments/mercadopago/account';

/**
 * Vuelta del OAuth de Mercado Pago. Valida el `state` (CSRF), canjea el `code`
 * por tokens y los guarda CIFRADOS asociados al negocio. Verifica que el usuario
 * siga siendo admin del MISMO negocio que inició el flujo (defensa contra que un
 * callback termine escribiendo en el negocio equivocado).
 *
 * El estado final SIEMPRE se refleja en la URL de settings; nunca se exponen
 * tokens al cliente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const jar = await cookies();
  const expectedState = jar.get('mp_oauth_state')?.value;
  const verifier = jar.get('mp_oauth_verifier')?.value;
  const cookieBusiness = jar.get('mp_oauth_business')?.value;

  // Limpia las cookies del flujo pase lo que pase.
  for (const name of ['mp_oauth_state', 'mp_oauth_verifier', 'mp_oauth_business']) {
    jar.set(name, '', { path: '/api/payments/mp', maxAge: 0 });
  }

  if (!code || !state || !expectedState || !verifier || state !== expectedState) {
    return NextResponse.redirect(dest('error'));
  }

  const ctx = await getDashboardContext();
  if (
    !ctx ||
    (ctx.role !== 'owner' && ctx.role !== 'admin') ||
    ctx.business.id !== cookieBusiness
  ) {
    return NextResponse.redirect(dest('error'));
  }

  try {
    const tokens = await exchangeCode(code, verifier);
    // Service role: mp_oauth_accounts tiene RLS deny-all a clientes.
    await saveTokens(createServiceClient(), ctx.business.id, tokens);
  } catch {
    return NextResponse.redirect(dest('error'));
  }

  return NextResponse.redirect(dest('connected'));
}

function dest(status: 'connected' | 'error'): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/es/dashboard/settings?tab=payments&mp=${status}`;
}
