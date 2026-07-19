/**
 * Álgebra de intervalos sobre instantes UTC.
 *
 * Todo el motor razona en milisegundos epoch (`number`), no en `Date`: comparar
 * y aritmética con números es exacto y barato, y evita el riesgo de mezclar
 * husos por accidente. Los `Date` se convierten en la frontera del motor
 * (entrada/salida), nunca aquí dentro.
 *
 * Convención de bordes: intervalo `[start, end)` — cerrado al inicio, abierto al
 * final. Es la misma que el constraint `bookings_no_overlap` de la DB
 * (`tstzrange(starts_at, ends_at, '[)')`): una reserva 10:00-10:30 y otra
 * 10:30-11:00 NO se solapan. Mantener esta convención alineada con la DB es lo
 * que evita que el motor ofrezca un slot que el INSERT rechace.
 */

/** Rango medio-abierto `[start, end)` en ms epoch UTC. Invariante: `end > start`. */
export interface Interval {
  start: number;
  end: number;
}

/** Dos intervalos se solapan si comparten algún instante interior (borde `[)`). */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** `inner` cabe completo dentro de `outer` (bordes incluidos). */
export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/**
 * Normaliza una lista de intervalos: descarta los vacíos/invertidos, ordena por
 * inicio y fusiona los que se tocan o solapan. La salida es una lista disjunta y
 * ordenada — la forma canónica con la que trabajan `intersect` y `subtract`.
 *
 * Fusiona los que se TOCAN (`b.start <= a.end`), no solo los que se solapan: dos
 * tramos de horario 09:00-13:00 y 13:00-18:00 son, a efectos de disponibilidad,
 * un bloque continuo 09:00-18:00.
 */
export function normalize(intervals: Interval[]): Interval[] {
  const valid = intervals.filter((i) => i.end > i.start);
  if (valid.length === 0) return [];

  const sorted = [...valid].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0]! }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

/**
 * Intersección de dos conjuntos de intervalos: los instantes cubiertos por AMBOS.
 * Es el `∩` de la fórmula `horario_staff ∩ horario_negocio`.
 *
 * Ambas entradas se normalizan primero, así que el barrido de dos punteros es
 * correcto sin importar el orden o los solapamientos de la entrada.
 */
export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const left = normalize(a);
  const right = normalize(b);
  const result: Interval[] = [];

  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const l = left[i]!;
    const r = right[j]!;
    const start = Math.max(l.start, r.start);
    const end = Math.min(l.end, r.end);
    if (end > start) result.push({ start, end });

    // Avanza el que termina antes: el otro todavía puede cruzarse con el siguiente.
    if (l.end < r.end) i++;
    else j++;
  }
  return result;
}

/**
 * Resta: los instantes de `base` que NO caen en ningún intervalo de `holes`.
 * Es el `−` de la fórmula: `... − bookings − bloqueos − gcal`. Un hueco en medio
 * de un tramo lo parte en dos (ej. un almuerzo divide el día).
 */
export function subtract(base: Interval[], holes: Interval[]): Interval[] {
  const gaps = normalize(holes);
  if (gaps.length === 0) return normalize(base);

  const result: Interval[] = [];
  for (const piece of normalize(base)) {
    let cursor = piece.start;
    for (const gap of gaps) {
      if (gap.end <= cursor || gap.start >= piece.end) continue; // no toca este trozo
      if (gap.start > cursor) result.push({ start: cursor, end: gap.start });
      cursor = Math.max(cursor, gap.end);
      if (cursor >= piece.end) break;
    }
    if (cursor < piece.end) result.push({ start: cursor, end: piece.end });
  }
  return result;
}

/** Unión: todos los instantes cubiertos por al menos un intervalo. */
export function union(...groups: Interval[][]): Interval[] {
  return normalize(groups.flat());
}
