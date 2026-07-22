import 'server-only';

/**
 * Flujo OAuth Authorization Code de Mercado Pago (Chile). Verificado contra la
 * doc oficial vigente:
 *   - Authorize: https://auth.mercadopago.cl/authorization
 *   - Token:     POST https://api.mercadopago.com/oauth/token
 *   - Access token dura ~180 días; el refresh_token ROTA en cada renovación
 *     (hay que persistir el nuevo). El `code` del callback vive 10 minutos.
 *
 * Estas funciones son puras (fetch a MP), sin tocar la DB. El almacenamiento
 * cifrado y el refresh programado viven en `account.ts` / los jobs de Inngest.
 */

import { createHash, randomBytes } from 'node:crypto';
import { getMpConfig, getMpRedirectUri } from '../env';

const AUTHORIZE_URL = 'https://auth.mercadopago.cl/authorization';
const TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

/** Respuesta del token endpoint (authorization_code y refresh_token). */
export interface MpTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Id de la cuenta MP del vendedor. */
  user_id: number;
  /** Segundos de validez del access token (~15552000 = 180 días). */
  expires_in: number;
  public_key: string;
  scope: string;
  token_type: string;
  live_mode: boolean;
}

/** Par PKCE: el `verifier` se guarda en cookie; el `challenge` va en la URL. */
export interface PkcePair {
  verifier: string;
  challenge: string;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createPkce(): PkcePair {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function randomState(): string {
  return base64url(randomBytes(24));
}

/** URL a la que redirigimos al negocio para que autorice a Ressy. */
export function buildAuthorizeUrl(state: string, challenge: string): string {
  const cfg = getMpConfig();
  if (!cfg) throw new Error('Mercado Pago no está configurado (MP_CLIENT_ID/SECRET).');
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: getMpRedirectUri(),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function postToken(body: Record<string, string>): Promise<MpTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Nunca logueamos el body completo (puede traer datos sensibles); solo el status.
    throw new Error(`MP oauth/token falló: HTTP ${res.status}`);
  }
  return (await res.json()) as MpTokenResponse;
}

/** Canjea el `code` del callback por access/refresh token (con PKCE). */
export function exchangeCode(code: string, codeVerifier: string): Promise<MpTokenResponse> {
  const cfg = getMpConfig();
  if (!cfg) throw new Error('Mercado Pago no está configurado.');
  return postToken({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getMpRedirectUri(),
    code_verifier: codeVerifier,
  });
}

/** Renueva el access token. Devuelve un refresh_token NUEVO que hay que guardar. */
export function refreshAccessToken(refreshToken: string): Promise<MpTokenResponse> {
  const cfg = getMpConfig();
  if (!cfg) throw new Error('Mercado Pago no está configurado.');
  return postToken({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}
