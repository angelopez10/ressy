import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';

// La clave se lee en cada llamada (lazy), así que basta fijarla antes de importar.
beforeAll(() => {
  process.env.RESSY_MP_TOKEN_KEY = randomBytes(32).toString('base64');
});

const { encryptToken, decryptToken, isTokenCryptoConfigured } = await import('./crypto');

describe('crypto de tokens (AES-256-GCM)', () => {
  it('roundtrip: descifrar lo cifrado devuelve el original', () => {
    const secret = 'APP_USR-1234567890-mp-access-token';
    expect(decryptToken(encryptToken(secret))).toBe(secret);
  });

  it('cada cifrado usa un IV distinto (no es determinista)', () => {
    const a = encryptToken('x');
    const b = encryptToken('x');
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe('x');
    expect(decryptToken(b)).toBe('x');
  });

  it('el ciphertext no contiene el texto plano', () => {
    const enc = encryptToken('super-secret-token');
    expect(enc).not.toContain('super-secret-token');
    expect(enc.startsWith('v1:')).toBe(true);
  });

  it('detecta manipulación (GCM tag falla)', () => {
    const enc = encryptToken('tamper-me');
    const [v, iv, tag, dataB64] = enc.split(':');
    // Corrompe el último byte del ciphertext.
    const data = Buffer.from(dataB64!, 'base64');
    const last = data.length - 1;
    data[last] = (data[last] ?? 0) ^ 0xff;
    const tampered = `${v}:${iv}:${tag}:${data.toString('base64')}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it('rechaza formato/version inválidos', () => {
    expect(() => decryptToken('nope')).toThrow();
    expect(() => decryptToken('v2:a:b:c')).toThrow();
  });

  it('isTokenCryptoConfigured true con clave válida', () => {
    expect(isTokenCryptoConfigured()).toBe(true);
  });
});
