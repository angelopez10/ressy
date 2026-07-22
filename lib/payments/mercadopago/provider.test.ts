import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { MercadoPagoProvider } from './provider';

const SECRET = 'mp-webhook-secret';

beforeEach(() => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  process.env.MP_CLIENT_ID = 'c';
  process.env.MP_CLIENT_SECRET = 's';
  process.env.NEXT_PUBLIC_APP_URL = 'https://ressy.test';
});

/** Firma un webhook como lo hace MP: HMAC sobre `id:{res};request-id:{req};ts:{ts};`. */
function sign(resourceId: string, requestId: string, ts: string): string {
  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  return createHmac('sha256', SECRET).update(manifest).digest('hex');
}

function headers(sig: string, requestId: string): Headers {
  return new Headers({ 'x-signature': sig, 'x-request-id': requestId });
}

describe('MercadoPagoProvider.verifyWebhook', () => {
  const provider = new MercadoPagoProvider();

  it('acepta una firma válida y extrae recurso + evento', () => {
    const body = JSON.stringify({ type: 'payment', id: 'notif-99', data: { id: '12345' } });
    const ts = '1700000000';
    const v1 = sign('12345', 'req-1', ts);
    const res = provider.verifyWebhook(headers(`ts=${ts},v1=${v1}`, 'req-1'), body);

    expect(res.valid).toBe(true);
    expect(res.kind).toBe('payment');
    expect(res.resourceId).toBe('12345');
    expect(res.eventId).toBe('notif-99');
  });

  it('rechaza una firma que no calza', () => {
    const body = JSON.stringify({ type: 'payment', id: 'n', data: { id: '12345' } });
    const res = provider.verifyWebhook(headers('ts=1700000000,v1=deadbeef', 'req-1'), body);
    expect(res.valid).toBe(false);
  });

  it('rechaza si el request-id no es el firmado (manifest distinto)', () => {
    const ts = '1700000000';
    const v1 = sign('12345', 'req-1', ts);
    const body = JSON.stringify({ type: 'payment', id: 'n', data: { id: '12345' } });
    // Mismo v1 pero otro request-id ⇒ el manifest no coincide.
    const res = provider.verifyWebhook(headers(`ts=${ts},v1=${v1}`, 'req-OTHER'), body);
    expect(res.valid).toBe(false);
  });

  it('sin secret configurado, nunca valida', () => {
    delete process.env.MP_WEBHOOK_SECRET;
    const body = JSON.stringify({ type: 'payment', id: 'n', data: { id: '1' } });
    const res = provider.verifyWebhook(headers('ts=1,v1=x', 'r'), body);
    expect(res.valid).toBe(false);
  });

  it('tipo distinto de payment ⇒ kind other (se ignora aguas arriba)', () => {
    const ts = '1700000000';
    const v1 = sign('777', 'req-2', ts);
    const body = JSON.stringify({ type: 'merchant_order', id: 'n2', data: { id: '777' } });
    const res = provider.verifyWebhook(headers(`ts=${ts},v1=${v1}`, 'req-2'), body);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('other');
  });
});
