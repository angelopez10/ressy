/**
 * Puente entre las dos representaciones de tiempo del modelo (CLAUDE.md §3):
 *
 *   - Horarios recurrentes (`business_hours`, `staff_schedules`): HORA LOCAL del
 *     negocio, sin fecha ni huso. "Abrimos a las 09:00" sigue siendo las 09:00
 *     después de un cambio de DST.
 *   - Reservas y overrides: instantes UTC absolutos.
 *
 * Para calcular disponibilidad de un día concreto hay que resolver la hora local
 * a un instante UTC EN ESE DÍA, dejando que la librería aplique el offset real
 * (que cambia dos veces al año). Aquí es donde se gana o se pierde la corrección
 * frente a DST; por eso vive aislado y con tests dedicados.
 *
 * Se usa Luxon por su soporte de primera clase de zonas IANA y por exponer los
 * casos límite de DST (`isValid` en el hueco de primavera). Ver el diseño 03A.
 */

import { DateTime } from 'luxon';

/** Una fecha de calendario en la tz del negocio: año/mes/día, sin hora ni huso. */
export interface CalendarDay {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** 'HH:MM' o 'HH:MM:SS' → { hour, minute }. La DB entrega `time` como string. */
function parseWallTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':');
  return { hour: Number(h), minute: Number(m ?? '0') };
}

/**
 * Resuelve una hora local (`'09:00'`) de un día de calendario en una tz IANA al
 * instante UTC exacto, en ms epoch.
 *
 * DST — dos casos límite que Luxon resuelve y aquí documentamos:
 *   - Hueco de primavera (adelanto): esa hora local no existe. Luxon la mueve
 *     hacia adelante al primer instante válido. Para un horario de apertura es el
 *     comportamiento correcto: el negocio abre cuando el reloj llega ahí.
 *   - Solapamiento de otoño (atraso): la hora local ocurre dos veces. Luxon toma
 *     la primera ocurrencia. Aceptable para bordes de jornada; los slots
 *     intermedios se discretizan por minutos absolutos, sin ambigüedad.
 */
export function wallTimeToUtcMs(day: CalendarDay, time: string, timezone: string): number {
  const { hour, minute } = parseWallTime(time);
  const dt = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour, minute },
    { zone: timezone },
  );
  // `toMillis()` de un DateTime inválido es NaN; convertirlo aquí es un bug de
  // datos (tz mal escrita), no un caso de negocio. Que falle ruidoso.
  const ms = dt.toMillis();
  if (Number.isNaN(ms)) {
    throw new Error(
      `Hora local inválida: ${time} en ${timezone} el ${day.year}-${day.month}-${day.day}`,
    );
  }
  return ms;
}

/** ISO-8601 weekday (1=lunes … 7=domingo) de un día en la tz del negocio. */
export function isoWeekday(day: CalendarDay, timezone: string): number {
  return DateTime.fromObject({ year: day.year, month: day.month, day: day.day }, { zone: timezone })
    .weekday;
}

/**
 * Enumera los días de calendario (en la tz del negocio) que toca el rango UTC
 * `[from, to)`. El motor itera día por día porque los horarios recurrentes se
 * definen por día local, no por instante.
 *
 * Se calcula sobre las fechas LOCALES de `from`/`to`, no las UTC: un rango que
 * empieza 03:00 UTC puede seguir siendo "ayer" en Santiago.
 */
export function calendarDaysInRange(from: Date, to: Date, timezone: string): CalendarDay[] {
  const startDay = DateTime.fromJSDate(from, { zone: timezone }).startOf('day');
  const endDay = DateTime.fromJSDate(to, { zone: timezone }).startOf('day');

  const days: CalendarDay[] = [];
  let cursor = startDay;
  // `<=`: si `to` cae exactamente a medianoche local sigue perteneciendo al día
  // previo (rango '[)'), pero incluir el día de `to` no cuesta nada — sus slots
  // se recortan luego contra el rango real. Preferimos no perder un día por un
  // borde.
  while (cursor <= endDay) {
    days.push({ year: cursor.year, month: cursor.month, day: cursor.day });
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}
