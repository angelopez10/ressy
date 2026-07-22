import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeStatus, createPreference, refundPayment, getPayment } from './api';

/** Mock de fetch que captura la última llamada y devuelve `body`. */
function mockFetch(body: unknown) {
  const fn = vi.fn((..._args: unknown[]) => Promise.resolve({ ok: true, json: async () => body } as unknown as Response));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('normalizeStatus', () => {
  it('mapea el vocabulario de MP al nuestro', () => {
    expect(normalizeStatus('approved')).toBe('approved');
    expect(normalizeStatus('pending')).toBe('pending');
    expect(normalizeStatus('in_process')).toBe('in_process');
    expect(normalizeStatus('authorized')).toBe('in_process');
    expect(normalizeStatus('rejected')).toBe('rejected');
    expect(normalizeStatus('cancelled')).toBe('cancelled');
    expect(normalizeStatus('expired')).toBe('cancelled');
    expect(normalizeStatus('refunded')).toBe('refunded');
    expect(normalizeStatus('charged_back')).toBe('refunded');
    expect(normalizeStatus('weird')).toBe('pending');
  });
});

describe('createPreference', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('cobra en CLP como integer, con external_reference y SIN marketplace_fee', async () => {
    const fetchFn = mockFetch({ id: 'pref-1', init_point: 'https://mp/i', sandbox_init_point: 'https://mp/s' });
    await createPreference('SELLER_TOKEN', {
      amount: 9900, // CLP: pesos, sin decimales
      currency: 'CLP',
      description: 'Anticipo · Corte',
      bookingId: 'bk-123',
      notificationUrl: 'https://ressy/api/payments/mp/webhook?biz=b1',
      successUrl: 'https://ressy/ok',
      failureUrl: 'https://ressy/fail',
      pendingUrl: 'https://ressy/pending',
    });

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
    const body = JSON.parse((init as RequestInit).body as string);

    expect(body.items[0].unit_price).toBe(9900);
    expect(Number.isInteger(body.items[0].unit_price)).toBe(true);
    expect(body.items[0].currency_id).toBe('CLP');
    expect(body.external_reference).toBe('bk-123');
    expect(body.notification_url).toContain('biz=b1');
    // Ressy no cobra comisión de plataforma.
    expect(body.marketplace_fee).toBeUndefined();
    // Token del vendedor en el header.
    expect((init as RequestInit).headers).toMatchObject({ authorization: 'Bearer SELLER_TOKEN' });
  });

  it('manda idempotency key por reserva', async () => {
    const fetchFn = mockFetch({ id: 'p', init_point: 'a', sandbox_init_point: 'b' });
    await createPreference('T', {
      amount: 1000, currency: 'CLP', description: 'd', bookingId: 'bk-9',
      notificationUrl: 'n', successUrl: 's', failureUrl: 'f', pendingUrl: 'p',
    });
    const init = fetchFn.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-idempotency-key']).toBe('pref-bk-9');
  });
});

describe('refundPayment', () => {
  it('total = body vacío; parcial = { amount }', async () => {
    let fetchFn = mockFetch({ id: 1, status: 'approved' });
    await refundPayment('T', 'pay-1');
    expect(JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string)).toEqual({});

    vi.unstubAllGlobals();
    fetchFn = mockFetch({ id: 2, status: 'approved' });
    await refundPayment('T', 'pay-2', 5000);
    expect(JSON.parse((fetchFn.mock.calls[0]![1] as RequestInit).body as string)).toEqual({ amount: 5000 });
  });
});

describe('getPayment', () => {
  it('GET al endpoint del pago con el token del vendedor', async () => {
    const fetchFn = mockFetch({ id: 42, status: 'approved', transaction_amount: 9900, currency_id: 'CLP', payment_method_id: 'debit_card', external_reference: 'bk-1', date_approved: null });
    const p = await getPayment('SELLER', '42');
    expect(fetchFn.mock.calls[0]![0]).toBe('https://api.mercadopago.com/v1/payments/42');
    expect(p.external_reference).toBe('bk-1');
  });
});
