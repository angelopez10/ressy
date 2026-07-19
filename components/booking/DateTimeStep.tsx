'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { DateTime, Info } from 'luxon';
import { useTranslations } from 'next-intl';
import { fetchSlots } from '@/lib/booking/actions';
import { businessDayKey, formatSlotTime, timezoneLabel } from '@/lib/booking/format';
import type {
  BookingBusinessDTO,
  BookingPoliciesDTO,
  BookingServiceDTO,
  BookingFailure,
  SlotDTO,
} from '@/lib/booking/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  business: BookingBusinessDTO;
  policies: BookingPoliciesDTO;
  service: BookingServiceDTO;
  staffMemberId: string | null;
  locale: 'es' | 'en';
  conflict: BookingFailure | null;
  onPick: (slot: SlotDTO) => void;
}

/**
 * Paso 3: fecha y hora. Trae los slots del mes visible en UNA llamada al motor
 * (server action), los agrupa por día en la tz del negocio para marcar los días
 * con disponibilidad (punto de acento) y deshabilitar los que no la tienen, y
 * autoselecciona HOY (o el primer día disponible) para mostrar sus horas sin que
 * el cliente tenga que tocar el calendario. Toda hora se formatea en la timezone
 * del negocio con su label visible (CLAUDE.md §3). En desktop el calendario y las
 * horas van lado a lado (mockup de escritorio).
 */
export function DateTimeStep({
  business,
  service,
  staffMemberId,
  locale,
  conflict,
  onPick,
}: Props) {
  const t = useTranslations('booking.datetime');
  const tz = business.timezone;
  const errT = useTranslations('booking.errors');

  const todayKey = DateTime.now().setZone(tz).toISODate() ?? '';
  const [month, setMonth] = useState(() => DateTime.now().setZone(tz).startOf('month'));
  const [slotsByDay, setSlotsByDay] = useState<Map<string, SlotDTO[]>>(new Map());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<SlotDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = DateTime.now().setZone(tz).startOf('month');
  const canGoPrev = month > currentMonth;

  useEffect(() => {
    let active = true;
    setLoading(true);
    const from = month.toUTC().toISO()!;
    const to = month.endOf('month').plus({ days: 1 }).startOf('day').toUTC().toISO()!;

    fetchSlots({
      businessId: business.id,
      serviceId: service.id,
      staffMemberId,
      fromIso: from,
      toIso: to,
    })
      .then((slots) => {
        if (!active) return;
        const grouped = new Map<string, SlotDTO[]>();
        for (const s of slots) {
          const key = businessDayKey(new Date(s.startsAtIso), tz);
          (grouped.get(key) ?? grouped.set(key, []).get(key)!).push(s);
        }
        setSlotsByDay(grouped);
        // Default: HOY si tiene disponibilidad; si no, el primer día del mes que
        // la tenga. Así se ven horas de inmediato sin tocar el calendario.
        const firstDay =
          grouped.has(todayKey) && month.hasSame(currentMonth, 'month')
            ? todayKey
            : ([...grouped.keys()].sort()[0] ?? null);
        setSelectedDay(firstDay);
        setSelected(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSlotsByDay(new Map());
        setSelectedDay(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id, service.id, staffMemberId, month, tz]);

  const daySlots = selectedDay ? (slotsByDay.get(selectedDay) ?? []) : [];
  const monthEmpty = !loading && slotsByDay.size === 0;

  return (
    <div className="flex flex-1 flex-col px-5 pt-2 pb-28 lg:pb-8">
      <h1 className="text-ink text-h3">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1 mb-4 flex items-center gap-1.5">
        <Globe className="size-3.5" aria-hidden="true" />
        {timezoneLabel(tz, month.toJSDate(), locale)}
      </p>

      {conflict && (
        <p
          role="alert"
          className="bg-warning-soft text-warning rounded-input text-small mb-4 px-4 py-3"
        >
          {conflict === 'slot_taken' ? errT('slotTaken') : errT('slotUnavailable')}
        </p>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <MonthCalendar
          month={month}
          todayKey={todayKey}
          locale={locale}
          slotsByDay={slotsByDay}
          selectedDay={selectedDay}
          canGoPrev={canGoPrev}
          onPrev={() => setMonth((m) => m.minus({ months: 1 }))}
          onNext={() => setMonth((m) => m.plus({ months: 1 }))}
          onSelectDay={(key) => {
            setSelectedDay(key);
            setSelected(null);
          }}
        />

        <div className="lg:min-h-[280px]">
          <h2 className="text-ink mt-6 mb-3 text-base font-semibold lg:mt-0">{t('available')}</h2>

          {loading ? (
            <SlotSkeleton />
          ) : monthEmpty || daySlots.length === 0 ? (
            <p className="text-ink-secondary rounded-card border-border text-small border border-dashed p-6 text-center">
              {t('none')}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {daySlots.map((s) => {
                const isSelected = selected?.startsAtIso === s.startsAtIso;
                return (
                  <button
                    key={s.startsAtIso}
                    type="button"
                    data-testid="slot-chip"
                    onClick={() => setSelected(s)}
                    aria-pressed={isSelected}
                    className={cn(
                      'rounded-input text-small border py-3 font-semibold transition-colors',
                      isSelected
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border text-ink hover:border-ink-tertiary',
                    )}
                  >
                    {formatSlotTime(new Date(s.startsAtIso), tz, locale)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CTA: barra fija abajo en móvil; inline al pie en desktop. */}
      <div
        className={cn(
          'from-surface pointer-events-none fixed inset-x-0 bottom-0 mx-auto max-w-[460px] bg-gradient-to-t from-70% to-transparent px-5 pt-6 pb-6',
          'lg:static lg:mx-0 lg:max-w-none lg:bg-none lg:px-0 lg:pt-6 lg:pb-0',
        )}
      >
        <div className="pointer-events-auto lg:flex lg:justify-end">
          <Button
            className="w-full lg:w-auto lg:min-w-[240px]"
            disabled={!selected}
            onClick={() => selected && onPick(selected)}
          >
            {selected
              ? `${t('continue')} · ${formatSlotTime(new Date(selected.startsAtIso), tz, locale)}`
              : t('pickTime')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({
  month,
  todayKey,
  locale,
  slotsByDay,
  selectedDay,
  canGoPrev,
  onPrev,
  onNext,
  onSelectDay,
}: {
  month: DateTime;
  todayKey: string;
  locale: string;
  slotsByDay: Map<string, SlotDTO[]>;
  selectedDay: string | null;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (key: string) => void;
}) {
  const weekdays = useMemo(() => Info.weekdays('narrow', { locale }), [locale]);
  const leading = month.weekday - 1; // ISO: 1=Mon → 0 blanks before Monday
  const daysInMonth = month.daysInMonth ?? 30;
  const monthLabel = month.setLocale(locale).toLocaleString({ month: 'long', year: 'numeric' });

  return (
    <div className="border-border rounded-card border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="←"
          className="bg-surface-alt text-ink flex size-8 items-center justify-center rounded-full disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="text-ink text-small font-semibold capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={onNext}
          aria-label="→"
          className="bg-surface-alt text-ink flex size-8 items-center justify-center rounded-full"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="text-ink-tertiary mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold">
        {weekdays.map((w, i) => (
          <span key={i} className="uppercase">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = month.set({ day: i + 1 });
          const key = day.toISODate() ?? '';
          const hasSlots = (slotsByDay.get(key)?.length ?? 0) > 0;
          const isSelected = key === selectedDay;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={!hasSlots}
              aria-pressed={isSelected}
              aria-label={hasSlots ? undefined : `${i + 1}`}
              onClick={() => onSelectDay(key)}
              className={cn(
                'text-small relative flex h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] transition-colors',
                isSelected && 'bg-ink font-semibold text-white',
                !isSelected && hasSlots && 'text-ink hover:bg-surface-alt',
                !isSelected && isToday && 'ring-accent/50 ring-1 ring-inset',
                !hasSlots && 'text-ink-tertiary cursor-not-allowed',
              )}
            >
              <span>{i + 1}</span>
              {/* Punto de disponibilidad: siempre reserva su alto para alinear. */}
              <span
                className={cn(
                  'h-1 w-1 rounded-full',
                  hasSlots && !isSelected ? 'bg-accent' : 'bg-transparent',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2.5" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-surface-alt rounded-input h-11 animate-pulse" />
      ))}
    </div>
  );
}
