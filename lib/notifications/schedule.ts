/**
 * Cálculo PURO de cuándo disparar cada recordatorio. Sin DB ni SDKs: es el
 * cerebro testeable del sistema (CLAUDE.md §6 · tests obligatorios).
 *
 * Husos y DST: el instante de disparo es `starts_at − N horas` en tiempo
 * ABSOLUTO (UTC). Restar horas a un instante UTC es inmune a DST — el cambio de
 * huso solo afecta cómo se MUESTRA la hora en el mensaje, no cuándo se dispara.
 * "24 horas antes" significa 24 horas absolutas, no "la misma hora de reloj de
 * ayer" (que en un día de cambio de DST diferiría en 1h).
 *
 * Reservas de última hora: si el instante de disparo ya pasó (`<= now`), ese
 * recordatorio se SALTA — nunca se agenda un envío en el pasado.
 */

export interface ReminderSettings {
  reminder1Enabled: boolean;
  reminder1Hours: number;
  reminder2Enabled: boolean;
  reminder2Hours: number;
}

export interface ReminderPlan {
  /** Identificador estable para idempotencia: 'reminder:1440' (minutos antes). */
  key: string;
  /** Horas antes de la cita. */
  hoursBefore: number;
  /** Instante UTC en que debe dispararse. */
  fireAt: Date;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Devuelve los recordatorios a agendar para una reserva, ya filtrados: solo los
 * habilitados y cuyo instante de disparo es futuro respecto a `now`.
 */
export function computeReminderSchedule(
  startsAt: Date,
  settings: ReminderSettings,
  now: Date = new Date(),
): ReminderPlan[] {
  const candidates: { enabled: boolean; hours: number }[] = [
    { enabled: settings.reminder1Enabled, hours: settings.reminder1Hours },
    { enabled: settings.reminder2Enabled, hours: settings.reminder2Hours },
  ];

  const plans: ReminderPlan[] = [];
  const seen = new Set<number>();

  for (const c of candidates) {
    if (!c.enabled || c.hours <= 0) continue;
    const minutes = Math.round(c.hours * 60);
    if (seen.has(minutes)) continue; // dos recordatorios idénticos ⇒ uno solo
    const fireAt = new Date(startsAt.getTime() - c.hours * HOUR_MS);
    if (fireAt.getTime() <= now.getTime()) continue; // última hora / pasado ⇒ saltar
    seen.add(minutes);
    plans.push({ key: `reminder:${minutes}`, hoursBefore: c.hours, fireAt });
  }

  // Ordena por disparo ascendente (el T-24h antes que el T-2h).
  return plans.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
