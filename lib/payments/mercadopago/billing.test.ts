import { describe, it, expect, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { MercadoPagoBilling } from './billing';

const SECRET = 'mp-webhook-secret';

beforeEach(() => {
  process.env.MP_WEBHOOK_SECRET = SECRET;
  process.env.MP_ACCESS_TOKEN = 'ressy-access-token';
  process.env.NEXT_PUBLIC_APP_URL = 'https://ressy.test';
});

function sign(resourceId: string, requestId: string, ts: string): string {
  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  return createHmac('sha256', SECRET).update(manifest).digest('hex');
}

function headers(sig: string, requestId: string): Headers {
  return new Headers({ 'x-signature': sig, 'x-request-id': requestId });
}

describe('MercadoPagoBilling', () => {
  const billing = new MercadoPagoBilling();

  it('isConfigured refleja MP_ACCESS_TOKEN', () => {
    expect(billing.isConfigured()).toBe(true);
    delete process.env.MP_ACCESS_TOKEN;
    expect(billing.isConfigured()).toBe(false);
  });

  it('mapea subscription_preapproval a kind preapproval con firma válida', () => {
    const ts = '1700000000';
    const v1 = sign('preapp-1', 'req-1', ts);
    const body = JSON.stringify({ type: 'subscription_preapproval', id: 'evt-1', data: { id: 'preapp-1' } });
    const res = billing.verifyWebhook(headers(`ts=${ts},v1=${v1}`, 'req-1'), body);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('preapproval');
    expect(res.resourceId).toBe('preapp-1');
    expect(res.eventId).toBe('evt-1');
  });

  it('mapea subscription_authorized_payment a kind authorized_payment', () => {
    const ts = '1700000000';
    const v1 = sign('ap-9', 'req-2', ts);
    const body = JSON.stringify({ type: 'subscription_authorized_payment', id: 'evt-2', data: { id: 'ap-9' } });
    const res = billing.verifyWebhook(headers(`ts=${ts},v1=${v1}`, 'req-2'), body);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('authorized_payment');
  });

  it('otro tipo ⇒ kind other', () => {
    const ts = '1700000000';
    const v1 = sign('x', 'req-3', ts);
    const body = JSON.stringify({ type: 'payment', id: 'evt-3', data: { id: 'x' } });
    const res = billing.verifyWebhook(headers(`ts=${ts},v1=${v1}`, 'req-3'), body);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('other');
  });

  it('firma inválida ⇒ no válido', () => {
    const body = JSON.stringify({ type: 'subscription_preapproval', id: 'e', data: { id: 'preapp-1' } });
    const res = billing.verifyWebhook(headers('ts=1,v1=deadbeef', 'req-1'), body);
    expect(res.valid).toBe(false);
  });

  it('sin token configurado, crear suscripción lanza', async () => {
    delete process.env.MP_ACCESS_TOKEN;
    await expect(
      billing.createSubscription({
        businessId: 'biz-1',
        tier: 'team',
        cycle: 'monthly',
        payerEmail: 'owner@test.com',
        locale: 'es',
      }),
    ).rejects.toThrow(/MP_ACCESS_TOKEN/);
  });
});
