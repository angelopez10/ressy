import 'server-only';

/**
 * Gestión de la cuenta MP conectada de un negocio: guardado CIFRADO de tokens,
 * lectura con refresh on-demand, y estado (connected/disconnected/error).
 *
 * Los tokens viven en `mp_oauth_accounts`, tabla con RLS deny-all a clientes:
 * SOLO el service role (webhooks/jobs/route handlers de confianza) entra acá.
 * Nunca se devuelven tokens en claro fuera de este módulo ni se loguean.
 */

import { DateTime } from 'luxon';
import { createServiceClient, type ServiceClient } from '@/lib/db/service';
import { encryptToken, decryptToken } from '../crypto';
import { refreshAccessToken, type MpTokenResponse } from './oauth';

export type MpConnectionStatus = 'connected' | 'disconnected' | 'error';

/** Estado seguro para la UI (SIN tokens). */
export interface MpConnectionInfo {
  status: MpConnectionStatus;
  mpUserId: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
}

/** Refresca proactivamente si el token expira dentro de esta ventana. */
const REFRESH_MARGIN_DAYS = 15;

function toExpiresAt(expiresInSec: number): string {
  return DateTime.utc().plus({ seconds: expiresInSec }).toISO()!;
}

/** Persiste (cifrando) los tokens tras conectar o refrescar. status → connected. */
export async function saveTokens(
  db: ServiceClient,
  businessId: string,
  tok: MpTokenResponse,
): Promise<void> {
  const { error } = await db.from('mp_oauth_accounts').upsert(
    {
      business_id: businessId,
      mp_user_id: String(tok.user_id),
      access_token_enc: encryptToken(tok.access_token),
      refresh_token_enc: encryptToken(tok.refresh_token),
      public_key: tok.public_key,
      scope: tok.scope,
      live_mode: tok.live_mode,
      expires_at: toExpiresAt(tok.expires_in),
      status: 'connected',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' },
  );
  if (error) throw new Error(`No se pudo guardar la cuenta MP: ${error.message}`);
}

/** Estado seguro (sin secretos) para el dashboard. */
export async function getConnectionInfo(
  db: ServiceClient,
  businessId: string,
): Promise<MpConnectionInfo> {
  const { data } = await db
    .from('mp_oauth_accounts')
    .select('status, mp_user_id, created_at, expires_at')
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return { status: 'disconnected', mpUserId: null, connectedAt: null, expiresAt: null };
  return {
    status: (data.status as MpConnectionStatus) ?? 'disconnected',
    mpUserId: data.mp_user_id,
    connectedAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

/** Marca la cuenta como con problemas (refresh falló, etc.). */
export async function markError(db: ServiceClient, businessId: string): Promise<void> {
  await db.from('mp_oauth_accounts').update({ status: 'error' }).eq('business_id', businessId);
}

/** Desconecta: borra los tokens. El negocio deberá reconectar para volver a cobrar. */
export async function disconnect(db: ServiceClient, businessId: string): Promise<void> {
  await db.from('mp_oauth_accounts').delete().eq('business_id', businessId);
}

/**
 * Access token válido del negocio, refrescando si está por expirar. Si el
 * refresh falla, marca la cuenta `error` y lanza — quien cobra debe abortar y
 * la UI avisará que reconecte. Devuelve el token EN CLARO solo en memoria.
 */
export async function getValidAccessToken(db: ServiceClient, businessId: string): Promise<string> {
  const { data } = await db
    .from('mp_oauth_accounts')
    .select('access_token_enc, refresh_token_enc, expires_at, status')
    .eq('business_id', businessId)
    .maybeSingle();

  if (!data || data.status === 'disconnected') {
    throw new Error('mp_not_connected');
  }

  const expiresAt = data.expires_at ? DateTime.fromISO(data.expires_at, { zone: 'utc' }) : null;
  const needsRefresh =
    !expiresAt || expiresAt <= DateTime.utc().plus({ days: REFRESH_MARGIN_DAYS });

  if (!needsRefresh && data.status === 'connected') {
    return decryptToken(data.access_token_enc);
  }

  // Refrescar. El refresh_token rota: guardamos el nuevo (saveTokens lo hace).
  try {
    const refreshed = await refreshAccessToken(decryptToken(data.refresh_token_enc));
    await saveTokens(db, businessId, refreshed);
    return refreshed.access_token;
  } catch {
    await markError(db, businessId);
    throw new Error('mp_refresh_failed');
  }
}

/** Azúcar: obtiene un service client + token válido en un paso. */
export async function withBusinessToken<T>(
  businessId: string,
  fn: (accessToken: string, db: ServiceClient) => Promise<T>,
): Promise<T> {
  const db = createServiceClient();
  const token = await getValidAccessToken(db, businessId);
  return fn(token, db);
}
