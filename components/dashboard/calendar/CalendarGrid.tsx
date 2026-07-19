'use client';

import { useMemo } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  GUTTER_PX,
  HOUR_ROW_PX,
  blockGeometry,
  dayIndexOf,
  hourLabels,
  isToday,
  minutesFromMidnight,
  rangeFor,
} from '@/lib/dashboard/grid';
import type { AgendaBundle, AgendaBookingDTO } from '@/lib/dashboard/types';
import { statusStyle } from './status';

/**
 * Grilla horaria del calendario. Columnas = profesionales (vista día) o días de
 * la semana (vista semana). Todo se dibuja en la tz del negocio (CLAUDE.md §3);
 * la posición de cada bloque sale de `blockGeometry`, que resuelve el instante
 * UTC a hora local con Luxon (DST-safe).
 */
export function CalendarGrid({
  bundle,
  locale,
  nowIso,
  onSelect,
}: {
  bundle: AgendaBundle;
  locale: string;
  nowIso: string;
  onSelect: (booking: AgendaBookingDTO) => void;
}) {
  const t = useTranslations('dashboard.calendar');
  const { business, view, anchorDate, startHour, endHour } = bundle;
  const tz = business.timezone;

  const { days } = useMemo(
    () => rangeFor(view, DateTime.fromISO(anchorDate, { zone: tz })),
    [view, anchorDate, tz],
  );

  const hours = hourLabels(startHour, endHour);
  const gridHeight = (endHour - startHour) * HOUR_ROW_PX;

  // Columnas: staff (día) o días (semana).
  const columns =
    view === 'day'
      ? bundle.staff.map((s) => ({ id: s.id, name: s.name, sub: s.role, day: days[0]! }))
      : days.map((d) => ({
          id: d.toISODate()!,
          name: d.setLocale(locale).toFormat('ccc'),
          sub: d.setLocale(locale).toFormat('d LLL'),
          day: d,
        }));

  const colTemplate = `${GUTTER_PX}px repeat(${columns.length}, minmax(0, 1fr))`;

  // Línea de "ahora": solo si el instante actual cae en un día visible y en rango.
  const now = DateTime.fromISO(nowIso, { zone: 'utc' }).setZone(tz);
  const nowMinutes = minutesFromMidnight(nowIso, tz);
  const nowTop = ((nowMinutes - startHour * 60) / 60) * HOUR_ROW_PX;
  const nowVisible = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;

  function bookingsForColumn(colId: string, colDay: DateTime): AgendaBookingDTO[] {
    if (view === 'day') return bundle.bookings.filter((b) => b.staffMemberId === colId);
    return bundle.bookings.filter(
      (b) => dayIndexOf(b.startsAtIso, days, tz) === days.findIndex((d) => d.hasSame(colDay, 'day')),
    );
  }

  function overridesForColumn(colId: string, colDay: DateTime) {
    return bundle.overrides.filter((o) => {
      const sameDay =
        DateTime.fromISO(o.startsAtIso, { zone: 'utc' }).setZone(tz).hasSame(colDay, 'day') ||
        DateTime.fromISO(o.endsAtIso, { zone: 'utc' }).setZone(tz).hasSame(colDay, 'day');
      if (!sameDay) return false;
      if (view === 'day') return o.staffMemberId === null || o.staffMemberId === colId;
      return true; // en semana la columna es el día completo
    });
  }

  return (
    <div className="min-w-fit" role="grid" aria-label={t('title')}>
      {/* Cabecera de columnas (sticky) */}
      <div
        className="border-border bg-surface sticky top-0 z-20 grid border-b"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div />
        {columns.map((c) => {
          const today = isToday(c.day, tz);
          return (
            <div
              key={c.id}
              className={cn(
                'border-border border-l px-2 py-2.5 text-center',
                today && 'bg-accent-soft',
              )}
            >
              <div className={cn('text-ink text-sm font-semibold', today && 'text-accent')}>
                {c.name}
              </div>
              {c.sub && <div className="text-ink-secondary text-xs">{c.sub}</div>}
            </div>
          );
        })}
      </div>

      {/* Cuerpo */}
      <div className="grid" style={{ gridTemplateColumns: colTemplate }}>
        {/* Canal de horas */}
        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="text-ink-tertiary absolute right-2 text-xs"
              style={{ top: i * HOUR_ROW_PX - 6 }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Columnas */}
        {columns.map((col) => {
          const today = isToday(col.day, tz);
          return (
            <div
              key={col.id}
              className="border-border relative border-l"
              style={{ height: gridHeight }}
              role="gridcell"
            >
              {/* rejilla horaria */}
              {hours.slice(0, -1).map((h, i) => (
                <div
                  key={h}
                  className="border-border absolute right-0 left-0 border-b"
                  style={{ top: (i + 1) * HOUR_ROW_PX }}
                />
              ))}

              {/* bloqueos (rayado gris) */}
              {overridesForColumn(col.id, col.day).map((o) => {
                const { top, height } = blockGeometry(o.startsAtIso, o.endsAtIso, tz, startHour);
                return (
                  <div
                    key={o.id}
                    className="border-border text-ink-secondary absolute right-1 left-1 overflow-hidden rounded-md border px-2 py-1 text-xs"
                    style={{
                      top: Math.max(0, top),
                      height: Math.max(18, height),
                      backgroundImage:
                        'repeating-linear-gradient(45deg, var(--color-surface-alt), var(--color-surface-alt) 6px, transparent 6px, transparent 12px)',
                    }}
                    title={o.reason ?? t('override.blocked')}
                  >
                    {o.reason ?? t('override.blocked')}
                  </div>
                );
              })}

              {/* línea de ahora */}
              {today && nowVisible && (
                <div
                  className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                  style={{ top: nowTop }}
                  aria-label={`${t('now')} ${now.setLocale(locale).toFormat('HH:mm')}`}
                >
                  <span className="bg-warning -ml-1 size-2 rounded-full" />
                  <span className="bg-warning h-px flex-1" />
                </div>
              )}

              {/* reservas */}
              {bookingsForColumn(col.id, col.day).map((b) => (
                <BookingBlock
                  key={b.id}
                  booking={b}
                  timezone={tz}
                  locale={locale}
                  startHour={startHour}
                  onSelect={onSelect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingBlock({
  booking,
  timezone,
  locale,
  startHour,
  onSelect,
}: {
  booking: AgendaBookingDTO;
  timezone: string;
  locale: string;
  startHour: number;
  onSelect: (booking: AgendaBookingDTO) => void;
}) {
  const style = statusStyle(booking.status);
  const { top, height } = blockGeometry(booking.startsAtIso, booking.endsAtIso, timezone, startHour);
  const startLabel = DateTime.fromISO(booking.startsAtIso, { zone: 'utc' })
    .setZone(timezone)
    .setLocale(locale)
    .toFormat('HH:mm');
  const compact = height <= HOUR_ROW_PX * 0.6;

  return (
    <button
      type="button"
      onClick={() => onSelect(booking)}
      className={cn(
        'focus-visible:ring-accent absolute right-1 left-1 overflow-hidden rounded-lg border-l-[3px] px-2.5 text-left transition-transform hover:z-10 hover:scale-[1.01] focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none',
        style.bg,
        compact ? 'py-1' : 'py-1.5',
        style.muted && 'opacity-70',
      )}
      style={{ top: Math.max(0, top), height: Math.max(20, height - 4), borderLeftColor: style.bar }}
    >
      <span
        className={cn(
          'text-ink block truncate text-[13px] font-semibold',
          style.strike && 'line-through',
        )}
      >
        {booking.customerName}
      </span>
      {!compact && (
        <span className="text-ink-secondary block truncate text-xs">
          {startLabel} · {booking.serviceName}
        </span>
      )}
    </button>
  );
}
