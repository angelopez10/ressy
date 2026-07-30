import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Tests de la firma de las cookies de admin. Son la primera línea contra una
 * cookie fabricada a mano: si esto se rompe, un atacante puede proponerle a la
 * app un `sid`/`iid` arbitrario y forzar una consulta a la DB con datos suyos.
 *
 * `signing.ts` lee el secreto de env en cada llamada, así que se puede rotar
 * dentro del test para simular otro emisor.
 */

const SECRET_A = 'a'.repeat(48);
const SECRET_B = 'b'.repeat(48);

async function load() {
  // Import fresco por test: no hay estado, pero deja explícito que el secreto
  // se lee en caliente.
  return import('./signing');
}

beforeEach(() => {
  process.env.RESSY_ADMIN_SECRET = SECRET_A;
});

afterEach(() => {
  delete process.env.RESSY_ADMIN_SECRET;
});

describe('signPayload / verifyPayload', () => {
  it('ida y vuelta: lo firmado se recupera intacto', async () => {
    const { signPayload, verifyPayload } = await load();
    const signed = signPayload({ sid: 'abc', uid: 'user-1', exp: 123 });
    expect(signed).toBeTruthy();
    expect(verifyPayload(signed!)).toEqual({ sid: 'abc', uid: 'user-1', exp: 123 });
  });

  it('rechaza el payload manipulado (el caso que importa)', async () => {
    const { signPayload, verifyPayload } = await load();
    const signed = signPayload({ sid: 'mio', uid: 'user-1', exp: 999 })!;
    const [, sig] = signed.split('.');

    // Un atacante reemplaza el payload por otro y conserva la firma.
    const forgedPayload = Buffer.from(JSON.stringify({ sid: 'ajeno', uid: 'user-2', exp: 999 }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(verifyPayload(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it('rechaza una firma emitida con otro secreto', async () => {
    const { signPayload } = await load();
    const signed = signPayload({ sid: 'abc', uid: 'user-1', exp: 1 })!;

    process.env.RESSY_ADMIN_SECRET = SECRET_B;
    const { verifyPayload } = await import('./signing');
    expect(verifyPayload(signed)).toBeNull();
  });

  it('rechaza basura, vacío y undefined sin lanzar', async () => {
    const { verifyPayload } = await load();
    expect(verifyPayload(undefined)).toBeNull();
    expect(verifyPayload('')).toBeNull();
    expect(verifyPayload('sinpunto')).toBeNull();
    expect(verifyPayload('.')).toBeNull();
    expect(verifyPayload('a.')).toBeNull();
    expect(verifyPayload('.b')).toBeNull();
    expect(verifyPayload('no-base64.firma-cualquiera')).toBeNull();
  });

  it('sin secreto configurado no firma ni verifica (panel apagado)', async () => {
    const { signPayload } = await load();
    const signed = signPayload({ sid: 'abc' })!;

    delete process.env.RESSY_ADMIN_SECRET;
    const { verifyPayload, signPayload: sign2 } = await import('./signing');
    expect(sign2({ sid: 'abc' })).toBeNull();
    expect(verifyPayload(signed)).toBeNull();
  });

  it('un secreto demasiado corto cuenta como no configurado', async () => {
    process.env.RESSY_ADMIN_SECRET = 'corto';
    const { signPayload } = await import('./signing');
    expect(signPayload({ sid: 'abc' })).toBeNull();
  });
});

describe('isExpired', () => {
  it('vencido cuando exp ya pasó', async () => {
    const { isExpired } = await load();
    const now = 1_000_000_000_000;
    expect(isExpired(now / 1000 - 1, now)).toBe(true);
    expect(isExpired(now / 1000 + 60, now)).toBe(false);
  });

  it('trata como VENCIDO cualquier exp ausente o no numérico (fail-closed)', async () => {
    const { isExpired } = await load();
    expect(isExpired(undefined)).toBe(true);
    expect(isExpired(null)).toBe(true);
    expect(isExpired('9999999999')).toBe(true);
    expect(isExpired(Number.NaN)).toBe(true);
    expect(isExpired(Number.POSITIVE_INFINITY)).toBe(true);
  });
});

describe('hashOtp', () => {
  it('es determinista con el mismo secreto y distinto con otro', async () => {
    const { hashOtp } = await load();
    const a = hashOtp('123456');
    expect(a).toBe(hashOtp('123456'));
    expect(a).not.toBe(hashOtp('123457'));

    process.env.RESSY_ADMIN_SECRET = SECRET_B;
    const { hashOtp: hash2 } = await import('./signing');
    // El pepper cambia el hash: un dump de la DB no permite verificar offline.
    expect(hash2('123456')).not.toBe(a);
  });

  it('nunca devuelve el código en claro', async () => {
    const { hashOtp } = await load();
    expect(hashOtp('123456')).not.toContain('123456');
  });
});
