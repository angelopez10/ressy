import { describe, expect, it } from 'vitest';
import { calendarDaysInRange, isoWeekday, wallTimeToUtcMs } from './time';

const SANTIAGO = 'America/Santiago';

describe('wallTimeToUtcMs — DST', () => {
  it('aplica el offset del día concreto (invierno -04)', () => {
    const ms = wallTimeToUtcMs({ year: 2026, month: 7, day: 20 }, '09:00', SANTIAGO);
    expect(new Date(ms).toISOString()).toBe('2026-07-20T13:00:00.000Z');
  });

  it('aplica el offset tras el cambio a horario de verano (-03)', () => {
    // Chile adelanta el reloj en la noche del 5 al 6 de septiembre de 2026.
    const ms = wallTimeToUtcMs({ year: 2026, month: 9, day: 7 }, '09:00', SANTIAGO);
    expect(new Date(ms).toISOString()).toBe('2026-09-07T12:00:00.000Z');
  });

  it('la MISMA hora local da instantes UTC distintos a cada lado del cambio', () => {
    const before = wallTimeToUtcMs({ year: 2026, month: 9, day: 4 }, '09:00', SANTIAGO);
    const after = wallTimeToUtcMs({ year: 2026, month: 9, day: 7 }, '09:00', SANTIAGO);
    // 3 días de calendario, pero 3 días − 1 hora de tiempo absoluto por el adelanto.
    const hoursApart = (after - before) / 3_600_000;
    expect(hoursApart).toBe(3 * 24 - 1);
  });
});

describe('isoWeekday', () => {
  it('1=lunes … 7=domingo (coincide con extract(isodow))', () => {
    expect(isoWeekday({ year: 2026, month: 7, day: 20 }, SANTIAGO)).toBe(1); // lunes
    expect(isoWeekday({ year: 2026, month: 7, day: 26 }, SANTIAGO)).toBe(7); // domingo
  });
});

describe('calendarDaysInRange', () => {
  it('enumera los días locales que toca un rango UTC', () => {
    const from = new Date('2026-07-20T12:00:00Z'); // 08:00 local
    const to = new Date('2026-07-22T12:00:00Z');
    const days = calendarDaysInRange(from, to, SANTIAGO);
    expect(days.map((d) => d.day)).toEqual([20, 21, 22]);
  });
});
