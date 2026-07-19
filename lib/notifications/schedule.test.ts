import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { computeReminderSchedule, type ReminderSettings } from './schedule';

const settings: ReminderSettings = {
  reminder1Enabled: true,
  reminder1Hours: 24,
  reminder2Enabled: true,
  reminder2Hours: 2,
};

describe('computeReminderSchedule', () => {
  it('agenda T-24h y T-2h antes de la cita', () => {
    const startsAt = new Date('2026-08-01T15:00:00Z');
    const now = new Date('2026-07-30T09:00:00Z');
    const plans = computeReminderSchedule(startsAt, settings, now);

    expect(plans).toHaveLength(2);
    expect(plans[0]!.key).toBe('reminder:1440');
    expect(plans[0]!.fireAt.toISOString()).toBe('2026-07-31T15:00:00.000Z');
    expect(plans[1]!.key).toBe('reminder:120');
    expect(plans[1]!.fireAt.toISOString()).toBe('2026-08-01T13:00:00.000Z');
  });

  it('salta recordatorios cuyo disparo ya pasó (reserva de última hora)', () => {
    // Reserva para dentro de 1 hora: el T-24h y el T-2h caen en el pasado.
    const startsAt = new Date('2026-08-01T15:00:00Z');
    const now = new Date('2026-08-01T14:00:00Z');
    const plans = computeReminderSchedule(startsAt, settings, now);
    expect(plans).toHaveLength(0);
  });

  it('con reserva a +3h solo dispara el T-2h', () => {
    const startsAt = new Date('2026-08-01T15:00:00Z');
    const now = new Date('2026-08-01T12:00:00Z');
    const plans = computeReminderSchedule(startsAt, settings, now);
    expect(plans.map((p) => p.key)).toEqual(['reminder:120']);
  });

  it('permite un solo recordatorio si uno está deshabilitado', () => {
    const startsAt = new Date('2026-08-01T15:00:00Z');
    const now = new Date('2026-07-30T09:00:00Z');
    const plans = computeReminderSchedule(startsAt, { ...settings, reminder2Enabled: false }, now);
    expect(plans.map((p) => p.key)).toEqual(['reminder:1440']);
  });

  it('deduplica dos offsets idénticos en uno', () => {
    const startsAt = new Date('2026-08-01T15:00:00Z');
    const now = new Date('2026-07-30T09:00:00Z');
    const plans = computeReminderSchedule(startsAt, { reminder1Enabled: true, reminder1Hours: 24, reminder2Enabled: true, reminder2Hours: 24 }, now);
    expect(plans).toHaveLength(1);
  });

  it('DST: el disparo es absoluto (starts_at − N horas), inmune al cambio de huso', () => {
    // Chile adelanta el reloj el 2026-09-06 (America/Santiago).
    const startsAt = DateTime.fromObject(
      { year: 2026, month: 9, day: 6, hour: 12 },
      { zone: 'America/Santiago' },
    ).toJSDate();
    const now = new Date('2026-09-04T00:00:00Z');
    const plans = computeReminderSchedule(startsAt, { ...settings, reminder2Enabled: false }, now);
    // 24h absolutas antes, sin importar que ese día tenga 23h de reloj local.
    expect(plans[0]!.fireAt.getTime()).toBe(startsAt.getTime() - 24 * 3600 * 1000);
  });
});

describe('display en tz del negocio (Luxon, DST-safe)', () => {
  it('muestra la hora local correcta cruzando un cambio de DST', () => {
    // 21:00 local del día ANTES del cambio y 21:00 local del día DEL cambio
    // corresponden a instantes UTC con offset distinto; Luxon lo resuelve.
    const before = DateTime.fromObject({ year: 2026, month: 9, day: 5, hour: 21 }, { zone: 'America/Santiago' });
    const after = DateTime.fromObject({ year: 2026, month: 9, day: 6, hour: 21 }, { zone: 'America/Santiago' });
    expect(before.toUTC().hour).not.toBe(after.toUTC().hour); // offset cambió
    // Pero renderizados en su tz, ambos dicen 21:00.
    expect(before.toFormat('HH:mm')).toBe('21:00');
    expect(after.toFormat('HH:mm')).toBe('21:00');
  });
});
