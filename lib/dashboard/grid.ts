/**
 * Geometría y tiempo de la grilla del calendario. Puro y sin `server-only`: lo
 * usan tanto el server component (para calcular el rango a cargar) como el
 * calendario cliente (para posicionar bloques y pintar la línea de "ahora").
 *
 * Regla de husos (CLAUDE.md §3): la grilla se dibuja SIEMPRE en la tz del
 * negocio. Un instante UTC se posiciona resolviendo su hora local con Luxon
 * (DST-safe), nunca con la tz del browser.
 */

import { DateTime } from 'luxon';
import type { CalendarView } from './types';

/** Alto en px de una fila de una hora. La grilla entera deriva de esto. */
export const HOUR_ROW_PX = 60;
/** Ancho del canal de horas a la izquierda. */
export const GUTTER_PX = 64;

/** Días de una semana que arranca el lunes (Luxon ya usa lunes como día 1). */
export interface RangeResult {
  /** Inicio del rango en la tz del negocio. */
  start: DateTime;
  /** Fin EXCLUSIVO. */
  end: DateTime;
  /** Un DateTime al inicio de cada día del rango (1 en vista día, 7 en semana). */
  days: DateTime[];
}

/** Interpreta el `?date=` (YYYY-MM-DD) como inicio de día en la tz del negocio. */
export function parseAnchor(dateStr: string | undefined, timezone: string): DateTime {
  if (dateStr) {
    const dt = DateTime.fromISO(dateStr, { zone: timezone });
    if (dt.isValid) return dt.startOf('day');
  }
  return DateTime.now().setZone(timezone).startOf('day');
}

/** 'YYYY-MM-DD' del ancla, para volver a serializarlo en la URL. */
export function anchorToDateString(anchor: DateTime): string {
  return anchor.toFormat('yyyy-MM-dd');
}

/** Rango [start, end) y sus días para la vista. Semana = lunes→domingo. */
export function rangeFor(view: CalendarView, anchor: DateTime): RangeResult {
  if (view === 'day') {
    const start = anchor.startOf('day');
    const end = start.plus({ days: 1 });
    return { start, end, days: [start] };
  }
  const start = anchor.startOf('week'); // lunes
  const end = start.plus({ weeks: 1 });
  const days = Array.from({ length: 7 }, (_, i) => start.plus({ days: i }));
  return { start, end, days };
}

/** Navega al periodo anterior/siguiente según la vista. */
export function shiftAnchor(view: CalendarView, anchor: DateTime, dir: -1 | 1): DateTime {
  return view === 'day' ? anchor.plus({ days: dir }) : anchor.plus({ weeks: dir });
}

/**
 * Minutos desde la medianoche local (tz negocio) de un instante UTC. Base para
 * posicionar un bloque verticalmente. Se resuelve con Luxon, así que un bloque a
 * las 10:00 locales cae en la fila de las 10 aunque el offset cambie por DST.
 */
export function minutesFromMidnight(iso: string, timezone: string): number {
  const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(timezone);
  return dt.hour * 60 + dt.minute;
}

/** ¿A qué día del rango (índice) pertenece este instante, en la tz del negocio? */
export function dayIndexOf(iso: string, days: DateTime[], timezone: string): number {
  const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(timezone).startOf('day');
  return days.findIndex((d) => d.hasSame(dt, 'day'));
}

/** top/height en px de un bloque, relativo al inicio de la grilla (startHour). */
export function blockGeometry(
  startIso: string,
  endIso: string,
  timezone: string,
  startHour: number,
): { top: number; height: number } {
  const startMin = minutesFromMidnight(startIso, timezone) - startHour * 60;
  const endDt = DateTime.fromISO(endIso, { zone: 'utc' }).setZone(timezone);
  const startDt = DateTime.fromISO(startIso, { zone: 'utc' }).setZone(timezone);
  const durationMin = Math.max(15, endDt.diff(startDt, 'minutes').minutes);
  return {
    top: (startMin / 60) * HOUR_ROW_PX,
    height: (durationMin / 60) * HOUR_ROW_PX,
  };
}

/** Etiquetas de hora del canal izquierdo, de startHour a endHour inclusive. */
export function hourLabels(startHour: number, endHour: number): number[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
}

/** ¿El día `d` es hoy en la tz del negocio? */
export function isToday(d: DateTime, timezone: string): boolean {
  return d.hasSame(DateTime.now().setZone(timezone), 'day');
}
