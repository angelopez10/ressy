import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifica la firma `x-signature` de un webhook de Mercado Pago: HMAC-SHA256
 * sobre el manifest `id:<resource>;request-id:<rid>;ts:<ts>;`. Pura y compartida
 * entre anticipos y suscripciones (misma app de MP, mismo `MP_WEBHOOK_SECRET`).
 *
 * Sin secret o firma malformada ⇒ `false`: nunca se procesa un webhook que no se
 * pudo verificar (CLAUDE.md §9).
 */
export function verifyMpSignature(headers: Headers, resourceId: string, secret: string | null): boolean {
  if (!secret) return false;

  const sigHeader = headers.get('x-signature');
  if (!sigHeader) return false;
  const requestId = headers.get('x-request-id') ?? '';

  // x-signature: "ts=...,v1=..."
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => kv.split('=').map((s) => s.trim()) as [string, string]),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
