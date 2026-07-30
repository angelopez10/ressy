import { describe, expect, it } from 'vitest';
import { trackServer, flushAnalytics, planName, toAnalyticsLocale, commonPropsFor } from './server';

describe('trackServer — no-op seguro en test / sin key', () => {
  it('resuelve sin lanzar y sin enviar nada (NODE_ENV=test)', async () => {
    // En test no hay cliente PostHog: debe ser un no-op silencioso.
    await expect(trackServer('booking_completed', 'biz_1', {})).resolves.toBeUndefined();
    await expect(
      trackServer('booking_created', 'biz_1', { origin: 'link', with_deposit: false }),
    ).resolves.toBeUndefined();
    await expect(flushAnalytics()).resolves.toBeUndefined();
  });
});

describe('helpers de enriquecimiento', () => {
  it('planName cae a free ante un tier inválido', () => {
    expect(planName('team')).toBe('team');
    expect(planName('bogus')).toBe('free');
    expect(planName(null)).toBe('free');
  });

  it('toAnalyticsLocale normaliza a es/en', () => {
    expect(toAnalyticsLocale('en')).toBe('en');
    expect(toAnalyticsLocale('es')).toBe('es');
    expect(toAnalyticsLocale(null)).toBe('es');
  });

  it('commonPropsFor no lanza si la DB falla (best-effort)', async () => {
    const badDb = {
      from() {
        throw new Error('db down');
      },
    } as never;
    await expect(commonPropsFor(badDb, 'biz_1')).resolves.toEqual({});
  });

  it('commonPropsFor deriva locale/country/plan de business + subscription', async () => {
    const db = {
      from(table: string) {
        const data =
          table === 'businesses'
            ? { currency: 'clp', booking_locale: 'en' }
            : { tier: 'studio' };
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data }),
        };
        return chain;
      },
    } as never;
    await expect(commonPropsFor(db, 'biz_1')).resolves.toEqual({
      locale: 'en',
      country: 'CL',
      plan: 'studio',
    });
  });
});
