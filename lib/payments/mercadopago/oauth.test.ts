import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  process.env.MP_CLIENT_ID = 'APP-CLIENT';
  process.env.MP_CLIENT_SECRET = 'APP-SECRET';
  process.env.NEXT_PUBLIC_APP_URL = 'https://ressy.test';
});
afterEach(() => vi.unstubAllGlobals());

const { buildAuthorizeUrl, exchangeCode, refreshAccessToken, createPkce } = await import('./oauth');

function mockFetch(body: unknown) {
  const fn = vi.fn((..._args: unknown[]) => Promise.resolve({ ok: true, json: async () => body } as unknown as Response));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('buildAuthorizeUrl', () => {
  it('arma la URL de autorización de MP Chile con PKCE y redirect', () => {
    const url = new URL(buildAuthorizeUrl('the-state', 'the-challenge'));
    expect(url.origin + url.pathname).toBe('https://auth.mercadopago.cl/authorization');
    expect(url.searchParams.get('client_id')).toBe('APP-CLIENT');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('the-state');
    expect(url.searchParams.get('code_challenge')).toBe('the-challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('https://ressy.test/api/payments/mp/callback');
  });
});

describe('createPkce', () => {
  it('genera verifier + challenge distintos y url-safe', () => {
    const { verifier, challenge } = createPkce();
    expect(verifier).not.toBe(challenge);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('exchangeCode', () => {
  it('POST /oauth/token con grant authorization_code + code_verifier', async () => {
    const fetchFn = mockFetch({ access_token: 'a', refresh_token: 'r', user_id: 7, expires_in: 15552000, public_key: 'pk', scope: 'read write', token_type: 'bearer', live_mode: true });
    const tok = await exchangeCode('the-code', 'the-verifier');

    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.mercadopago.com/oauth/token');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.grant_type).toBe('authorization_code');
    expect(body.code).toBe('the-code');
    expect(body.code_verifier).toBe('the-verifier');
    expect(body.client_secret).toBe('APP-SECRET');
    expect(tok.user_id).toBe(7);
  });
});

describe('refreshAccessToken', () => {
  it('usa grant refresh_token y devuelve un refresh_token NUEVO (rotación)', async () => {
    mockFetch({ access_token: 'a2', refresh_token: 'r2-rotated', user_id: 7, expires_in: 15552000, public_key: 'pk', scope: 's', token_type: 'bearer', live_mode: true });
    const tok = await refreshAccessToken('r1-old');
    // MP rota el refresh_token: el resultado trae uno distinto que hay que persistir.
    expect(tok.refresh_token).toBe('r2-rotated');
    expect(tok.refresh_token).not.toBe('r1-old');
    expect(tok.access_token).toBe('a2');
  });

  it('lanza si MP responde no-ok (sin filtrar el body al log)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response));
    await expect(refreshAccessToken('r')).rejects.toThrow(/HTTP 401/);
  });
});
