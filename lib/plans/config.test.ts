import { describe, it, expect } from 'vitest';
import {
  PLANS,
  PLAN_ORDER,
  UNLIMITED,
  TRIAL_PLAN,
  getPlan,
  getLimit,
  canUseFeature,
  priceFor,
  isAtLimit,
  planForLimit,
  planForFeature,
  isPlanId,
} from './config';

describe('plans/config — estructura', () => {
  it('tiene exactamente los 4 planes esperados, en orden', () => {
    expect(PLAN_ORDER).toEqual(['free', 'solo', 'team', 'studio']);
    expect(Object.keys(PLANS).sort()).toEqual(['free', 'solo', 'studio', 'team']);
  });

  it('Team es el único destacado (Más popular)', () => {
    expect(PLANS.team.popular).toBe(true);
    expect(PLANS.free.popular || PLANS.solo.popular || PLANS.studio.popular).toBe(false);
  });

  it('el trial usa Team', () => {
    expect(TRIAL_PLAN).toBe('team');
  });
});

describe('getLimit', () => {
  it('staff: 1 / 1 / 5 / 15', () => {
    expect(getLimit('free', 'staff')).toBe(1);
    expect(getLimit('solo', 'staff')).toBe(1);
    expect(getLimit('team', 'staff')).toBe(5);
    expect(getLimit('studio', 'staff')).toBe(15);
  });

  it('reservas/mes: 25 en Free, ∞ en el resto', () => {
    expect(getLimit('free', 'bookingsPerMonth')).toBe(25);
    expect(getLimit('solo', 'bookingsPerMonth')).toBe(UNLIMITED);
    expect(getLimit('team', 'bookingsPerMonth')).toBe(UNLIMITED);
    expect(getLimit('studio', 'bookingsPerMonth')).toBe(UNLIMITED);
  });

  it('servicios: 3 en Free, ∞ en el resto', () => {
    expect(getLimit('free', 'services')).toBe(3);
    expect(getLimit('solo', 'services')).toBe(UNLIMITED);
  });

  it('cuota WhatsApp: 0 / 100 / 500 / 2000', () => {
    expect(getLimit('free', 'whatsappPerMonth')).toBe(0);
    expect(getLimit('solo', 'whatsappPerMonth')).toBe(100);
    expect(getLimit('team', 'whatsappPerMonth')).toBe(500);
    expect(getLimit('studio', 'whatsappPerMonth')).toBe(2000);
  });
});

describe('canUseFeature', () => {
  it('WhatsApp: no en Free, sí en pagos', () => {
    expect(canUseFeature('free', 'whatsapp')).toBe(false);
    expect(canUseFeature('solo', 'whatsapp')).toBe(true);
    expect(canUseFeature('team', 'whatsapp')).toBe(true);
    expect(canUseFeature('studio', 'whatsapp')).toBe(true);
  });

  it('cobro de anticipos: solo en pagos', () => {
    expect(canUseFeature('free', 'deposits')).toBe(false);
    expect(canUseFeature('solo', 'deposits')).toBe(true);
  });

  it('no-show: desde Team', () => {
    expect(canUseFeature('free', 'noShowPolicy')).toBe(false);
    expect(canUseFeature('solo', 'noShowPolicy')).toBe(false);
    expect(canUseFeature('team', 'noShowPolicy')).toBe(true);
    expect(canUseFeature('studio', 'noShowPolicy')).toBe(true);
  });

  it('dominio propio / multi-sucursal / API: solo Studio', () => {
    for (const f of ['customDomain', 'multiLocation', 'apiWebhooks'] as const) {
      expect(canUseFeature('team', f)).toBe(false);
      expect(canUseFeature('studio', f)).toBe(true);
    }
  });

  it('email reminders: todos los planes', () => {
    for (const id of PLAN_ORDER) expect(canUseFeature(id, 'emailReminders')).toBe(true);
  });

  it('reports: Free none, Solo básicos, Team/Studio avanzados', () => {
    expect(canUseFeature('free', 'reports')).toBe(false);
    expect(canUseFeature('solo', 'reports')).toBe(true);
    expect(PLANS.studio.features.reports).toBe('advanced_csv');
  });
});

describe('priceFor', () => {
  it('USD mensual: 0 / 9 / 19 / 29', () => {
    expect(priceFor('free', 'usd', 'monthly')).toBe(0);
    expect(priceFor('solo', 'usd', 'monthly')).toBe(9);
    expect(priceFor('team', 'usd', 'monthly')).toBe(19);
    expect(priceFor('studio', 'usd', 'monthly')).toBe(29);
  });

  it('USD anual = 10 meses (2 gratis)', () => {
    expect(priceFor('solo', 'usd', 'yearly')).toBe(90);
    expect(priceFor('team', 'usd', 'yearly')).toBe(190);
    expect(priceFor('studio', 'usd', 'yearly')).toBe(290);
  });

  it('CLP mensual y anual', () => {
    expect(priceFor('team', 'clp', 'monthly')).toBe(19900);
    expect(priceFor('team', 'clp', 'yearly')).toBe(199000);
  });
});

describe('isAtLimit / planForLimit / planForFeature', () => {
  it('Free topa en 25 reservas; los ∞ nunca topan', () => {
    expect(isAtLimit('free', 'bookingsPerMonth', 24)).toBe(false);
    expect(isAtLimit('free', 'bookingsPerMonth', 25)).toBe(true);
    expect(isAtLimit('free', 'bookingsPerMonth', 999)).toBe(true);
    expect(isAtLimit('team', 'bookingsPerMonth', 10_000)).toBe(false);
  });

  it('planForLimit: cuántos profesionales resuelve qué plan', () => {
    expect(planForLimit('staff', 1)).toBe('free');
    expect(planForLimit('staff', 5)).toBe('team');
    expect(planForLimit('staff', 12)).toBe('studio');
    expect(planForLimit('staff', 999)).toBe('studio'); // 15 es el mayor base
  });

  it('planForFeature: primer plan que habilita cada feature', () => {
    expect(planForFeature('whatsapp')).toBe('solo');
    expect(planForFeature('noShowPolicy')).toBe('team');
    expect(planForFeature('customDomain')).toBe('studio');
  });
});

describe('defensivo', () => {
  it('getPlan cae a Free ante un tier inválido', () => {
    expect(getPlan('starter').id).toBe('free'); // tier viejo ya no existe
    expect(getPlan(null).id).toBe('free');
    expect(getPlan(undefined).id).toBe('free');
  });

  it('isPlanId reconoce solo los ids nuevos', () => {
    expect(isPlanId('team')).toBe(true);
    expect(isPlanId('pro')).toBe(false);
    expect(isPlanId('')).toBe(false);
  });
});
