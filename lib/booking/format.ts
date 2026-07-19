/**
 * Formateo de tiempo y dinero para la booking page.
 *
 * Los slots llegan del motor en UTC (`Date`). TODO se renderiza en la timezone
 * del negocio, nunca en la del browser (CLAUDE.md §3). Luxon es la misma librería
 * del motor de disponibilidad; la reusamos para no mezclar criterios de husos.
 */

import { DateTime, Info } from 'luxon';

/** Clave 'YYYY-MM-DD' de un instante en la tz del negocio. Identifica un día de calendario. */
export function businessDayKey(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toISODate() ?? '';
}

/** Hora corta local del negocio: '09:00'. */
export function formatSlotTime(instant: Date, timezone: string, locale: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone })
    .setLocale(locale)
    .toLocaleString(DateTime.TIME_SIMPLE);
}

/** Fecha larga local del negocio: 'martes, 14 de julio de 2026'. */
export function formatLongDate(instant: Date, timezone: string, locale: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone })
    .setLocale(locale)
    .toLocaleString(DateTime.DATE_HUGE);
}

/** Fecha media: 'mar, 14 jul'. Para chips y encabezados compactos. */
export function formatMediumDate(instant: Date, timezone: string, locale: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone })
    .setLocale(locale)
    .toLocaleString({ weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Label visible de timezone que exige el CLAUDE.md §3, tal como en el mockup:
 * "Horario de Santiago · GMT-3". Deriva la ciudad del IANA y el offset del día
 * concreto (respeta DST: en Santiago es -4 en invierno y -3 en verano).
 */
export function timezoneLabel(timezone: string, reference: Date, locale: string): string {
  const dt = DateTime.fromJSDate(reference, { zone: timezone });
  const city = timezone.split('/').pop()?.replaceAll('_', ' ') ?? timezone;
  const gmt = dt.toFormat('ZZZZ'); // 'GMT-3'
  const label = locale === 'en' ? `${city} time` : `Horario de ${city}`;
  return `${label} · ${gmt}`;
}

/**
 * Monto en la unidad menor de la moneda del negocio → string localizado.
 * Delega en Intl el número de decimales (CLP no tiene, USD tiene 2), igual que
 * `formatMoney` de la capa de datos. Duplicado mínimo a propósito: esta capa no
 * debe importar de lib/db.
 */
export function formatMoney(amount: number, currency: string, locale: string): string {
  // `useGrouping: 'always'` fuerza el separador de miles también en números de 4
  // cifras: el `es` genérico (España) no agrupa 1000–9999 (3600 → "3600"), lo que
  // se ve inconsistente junto a "12.000". Agrupar siempre da el look del mockup
  // (es-CL) y es consistente entre montos.
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    useGrouping: 'always',
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  return formatter.format(amount / 10 ** digits);
}

/**
 * Resumen legible del horario de atención a partir de `business_hours`. Agrupa
 * días consecutivos con el mismo horario: "Lun–Vie 09:00–19:00 · Sáb 10:00–15:00".
 * Los nombres de día salen localizados (Luxon, semana empieza en lunes = ISO).
 */
export function summarizeBusinessHours(
  rows: { weekday: number; openTime: string; closeTime: string }[],
  locale: string,
): string | null {
  if (rows.length === 0) return null;
  const short = Info.weekdays('short', { locale }); // índice 0 = lunes (ISO)
  const hhmm = (time: string) => time.slice(0, 5);
  const dayName = (w: number) => {
    const n = (short[w - 1] ?? '').replace(/\.$/, '');
    return n.charAt(0).toUpperCase() + n.slice(1);
  };

  const sorted = [...rows].sort((a, b) => a.weekday - b.weekday);
  const groups: { start: number; end: number; open: string; close: string }[] = [];
  for (const r of sorted) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.end === r.weekday - 1 &&
      last.open === r.openTime &&
      last.close === r.closeTime
    ) {
      last.end = r.weekday;
    } else {
      groups.push({ start: r.weekday, end: r.weekday, open: r.openTime, close: r.closeTime });
    }
  }

  return groups
    .map((g) => {
      const days = g.start === g.end ? dayName(g.start) : `${dayName(g.start)}–${dayName(g.end)}`;
      return `${days} ${hhmm(g.open)}–${hhmm(g.close)}`;
    })
    .join(' · ');
}

/**
 * Anticipo a cobrar según la política. Devuelve el monto en la unidad menor, o 0
 * si el negocio no pide anticipo. El redondeo de un porcentaje va hacia abajo:
 * nunca cobrar de más por un céntimo de redondeo.
 */
export function depositAmount(
  policy: {
    depositType: 'none' | 'percent' | 'fixed';
    depositPercent: number | null;
    depositAmount: number | null;
  },
  price: number,
): number {
  if (policy.depositType === 'percent' && policy.depositPercent != null) {
    return Math.floor((price * policy.depositPercent) / 100);
  }
  if (policy.depositType === 'fixed' && policy.depositAmount != null) {
    return Math.min(policy.depositAmount, price);
  }
  return 0;
}
