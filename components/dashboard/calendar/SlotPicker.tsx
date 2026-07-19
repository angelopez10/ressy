'use client';

import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { fetchSlots } from '@/lib/booking/actions';
import type { SlotDTO } from '@/lib/booking/types';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

/**
 * Selector de fecha + hora que consume el MOTOR DE DISPONIBILIDAD (fetchSlots),
 * así que nunca ofrece un slot ocupado (CLAUDE.md §3: no re-implementar el
 * motor, consumirlo). Se usa en la reserva manual y en el reagende.
 *
 * La fecha se elige en la tz del negocio; el rango del día se convierte a UTC
 * con Luxon antes de pedir slots. El valor devuelto es el ISO UTC del inicio.
 */
export function SlotPicker({
  businessId,
  serviceId,
  staffMemberId,
  timezone,
  locale,
  initialDate,
  value,
  onChange,
}: {
  businessId: string;
  serviceId: string;
  /** Staff fijo (columna concreta). */
  staffMemberId: string;
  timezone: string;
  locale: string;
  initialDate: string;
  value: string | null;
  onChange: (startsAtIso: string) => void;
}) {
  const t = useTranslations('dashboard.calendar.manual');
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<SlotDTO[] | null>(null);

  useEffect(() => {
    let active = true;
    setSlots(null);
    const dayStart = DateTime.fromISO(date, { zone: timezone }).startOf('day');
    if (!dayStart.isValid) {
      setSlots([]);
      return;
    }
    const dayEnd = dayStart.plus({ days: 1 });
    fetchSlots({
      businessId,
      serviceId,
      staffMemberId,
      fromIso: dayStart.toUTC().toISO()!,
      toIso: dayEnd.toUTC().toISO()!,
    })
      .then((res) => {
        if (active) setSlots(res.filter((s) => s.staffMemberId === staffMemberId));
      })
      .catch(() => {
        if (active) setSlots([]);
      });
    return () => {
      active = false;
    };
  }, [businessId, serviceId, staffMemberId, date, timezone]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-ink-secondary text-sm font-semibold">{t('pickDate')}</span>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <div>
        <span className="text-ink-secondary text-sm font-semibold">{t('pickTime')}</span>
        {slots === null ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-alt h-10 animate-pulse rounded-full" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-ink-secondary mt-2 text-sm">{t('noSlots')}</p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const label = DateTime.fromISO(s.startsAtIso, { zone: 'utc' })
                .setZone(timezone)
                .setLocale(locale)
                .toFormat('HH:mm');
              const selected = value === s.startsAtIso;
              return (
                <button
                  key={s.startsAtIso}
                  type="button"
                  onClick={() => onChange(s.startsAtIso)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-full border py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'border-accent bg-accent text-white'
                      : 'border-border text-ink hover:border-ink-tertiary',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
