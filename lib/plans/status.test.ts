import { describe, it, expect } from 'vitest';
import { bookingPeriodKey, trialDaysLeft, toTrialInfo } from './status';

/**
 * Nota: el contador de reservas y el downgrade del trial son funciones SQL
 * (SECURITY DEFINER, migración 13) — la autoridad del gating. Aquí probamos la
 * lógica JS que las acompaña: la clave de mes en la tz del negocio (mismo
 * contrato que el `date_trunc at time zone` de la DB) y el cálculo del trial.
 * El bloqueo real de la reserva 26 y "cancelada libera cupo" se cubren en e2e.
 */

describe('bookingPeriodKey — reseteo el día 1 en la tz del negocio', () => {
  const tz = 'America/Santiago';

  it('mismo mes local ⇒ misma clave (mismo ciclo)', () => {
    // Ambas son de julio en Santiago aunque una esté cerca del borde.
    expect(bookingPeriodKey('2026-07-01T05:00:00Z', tz)).toBe('2026-07');
    expect(bookingPeriodKey('2026-07-31T20:00:00Z', tz)).toBe('2026-07');
  });

  it('el borde del día 1 se evalúa en hora LOCAL, no UTC', () => {
    // 2026-08-01T02:00Z = 2026-07-31 22:00 en Santiago (UTC-4): AÚN es julio.
    expect(bookingPeriodKey('2026-08-01T02:00:00Z', tz)).toBe('2026-07');
    // 2026-08-01T05:00Z = 2026-08-01 01:00 en Santiago: ya es agosto ⇒ nuevo ciclo.
    expect(bookingPeriodKey('2026-08-01T05:00:00Z', tz)).toBe('2026-08');
  });

  it('DST: el cambio de horario no altera el mes local', () => {
    // Chile cambia de hora en septiembre; el offset pasa de -4 a -3, pero una
    // reserva de septiembre sigue siendo del ciclo de septiembre.
    expect(bookingPeriodKey('2026-09-06T10:00:00Z', tz)).toBe('2026-09');
    expect(bookingPeriodKey('2026-09-30T23:00:00Z', tz)).toBe('2026-09');
    // 2026-10-01T02:00Z = 2026-09-30 23:00 local (UTC-3): todavía septiembre.
    expect(bookingPeriodKey('2026-10-01T02:00:00Z', tz)).toBe('2026-09');
  });

  it('otra tz da otro corte para el mismo instante', () => {
    // Mismo instante, Tokio (UTC+9) ya está en el mes siguiente.
    const instant = '2026-07-31T20:00:00Z';
    expect(bookingPeriodKey(instant, 'America/Santiago')).toBe('2026-07');
    expect(bookingPeriodKey(instant, 'Asia/Tokyo')).toBe('2026-08');
  });
});

describe('trialDaysLeft', () => {
  const now = new Date('2026-07-19T12:00:00Z');

  it('redondea hacia arriba los días restantes', () => {
    expect(trialDaysLeft('2026-07-22T12:00:00Z', now)).toBe(3);
    expect(trialDaysLeft('2026-07-22T11:00:00Z', now)).toBe(3); // 2.96 días → 3
  });

  it('0 cuando ya venció o no hay fecha', () => {
    expect(trialDaysLeft('2026-07-19T11:00:00Z', now)).toBe(0);
    expect(trialDaysLeft('2026-07-10T12:00:00Z', now)).toBe(0);
    expect(trialDaysLeft(null, now)).toBe(0);
  });

  it('cruza DST sin romper el conteo', () => {
    // De julio (UTC-4) a después del cambio: el diff en días absolutos es correcto.
    const early = new Date('2026-09-05T12:00:00Z');
    expect(trialDaysLeft('2026-09-08T12:00:00Z', early)).toBe(3);
  });
});

describe('toTrialInfo', () => {
  const now = new Date('2026-07-19T12:00:00Z');

  it('no-trial ⇒ daysLeft 0 y no endingSoon', () => {
    const info = toTrialInfo({ is_trial: false, trial_ends_at: null }, now);
    expect(info).toMatchObject({ isTrial: false, daysLeft: 0, endingSoon: false });
  });

  it('trial con >3 días: no endingSoon', () => {
    const info = toTrialInfo({ is_trial: true, trial_ends_at: '2026-07-29T12:00:00Z' }, now);
    expect(info.daysLeft).toBe(10);
    expect(info.endingSoon).toBe(false);
  });

  it('trial en los últimos 3 días: endingSoon (aviso más notorio)', () => {
    const info = toTrialInfo({ is_trial: true, trial_ends_at: '2026-07-21T12:00:00Z' }, now);
    expect(info.daysLeft).toBe(2);
    expect(info.endingSoon).toBe(true);
  });

  it('trial ya vencido: daysLeft 0, no endingSoon (lo baja el job)', () => {
    const info = toTrialInfo({ is_trial: true, trial_ends_at: '2026-07-18T12:00:00Z' }, now);
    expect(info.daysLeft).toBe(0);
    expect(info.endingSoon).toBe(false);
  });
});
