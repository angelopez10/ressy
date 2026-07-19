'use client';

import { useTransition } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Lock, Plus } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { anchorToDateString, rangeFor, shiftAnchor } from '@/lib/dashboard/grid';
import type { AgendaBundle, CalendarView } from '@/lib/dashboard/types';

/**
 * Barra superior del calendario: título del periodo, navegación (anterior / hoy
 * / siguiente), toggle Día/Semana y las acciones Bloquear horario / Reserva
 * manual. La navegación viaja por la URL (?view=&date=) para que el server
 * component recargue solo el rango visible.
 */
export function CalendarToolbar({
  bundle,
  locale,
  onBlock,
  onManual,
}: {
  bundle: AgendaBundle;
  locale: string;
  onBlock: () => void;
  onManual: () => void;
}) {
  const t = useTranslations('dashboard.calendar');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tz = bundle.business.timezone;

  const anchor = DateTime.fromISO(bundle.anchorDate, { zone: tz }).setLocale(locale);

  function go(view: CalendarView, date: string) {
    startTransition(() => {
      router.push(`/dashboard/calendar?view=${view}&date=${date}`);
    });
  }

  const navigate = (dir: -1 | 1) =>
    go(bundle.view, anchorToDateString(shiftAnchor(bundle.view, anchor, dir)));
  const goToday = () => go(bundle.view, anchorToDateString(DateTime.now().setZone(tz)));
  const setView = (view: CalendarView) => go(view, bundle.anchorDate);

  // Título del periodo.
  let title: string;
  if (bundle.view === 'day') {
    title = anchor.toFormat("cccc d 'de' LLLL");
  } else {
    const { days } = rangeFor('week', anchor);
    const first = days[0]!;
    const last = days[6]!;
    title =
      first.month === last.month
        ? `${first.toFormat('d')} – ${last.toFormat("d 'de' LLLL")}`
        : `${first.toFormat('d LLL')} – ${last.toFormat('d LLL')}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-ink text-xl font-bold tracking-tight capitalize sm:text-2xl">
            {title}
          </h1>
          <p className="text-ink-tertiary text-xs">{t('tzLabel', { tz })}</p>
        </div>
        <div className={cn('flex gap-1', isPending && 'opacity-60')}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('previous')}
            className="bg-surface-alt text-ink hover:bg-border flex size-9 items-center justify-center rounded-full transition-colors"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="bg-surface-alt text-ink hover:bg-border rounded-full px-4 text-sm font-semibold transition-colors"
          >
            {t('today')}
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label={t('next')}
            className="bg-surface-alt text-ink hover:bg-border flex size-9 items-center justify-center rounded-full transition-colors"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-surface-alt inline-flex rounded-full p-1" role="group">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={bundle.view === v}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                bundle.view === v ? 'bg-ink text-white' : 'text-ink-secondary hover:text-ink',
              )}
            >
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={onBlock}>
          <Lock aria-hidden="true" />
          <span className="hidden sm:inline">{t('blockTime')}</span>
        </Button>
        <Button size="sm" onClick={onManual}>
          <Plus aria-hidden="true" />
          <span className="hidden sm:inline">{t('manualBooking')}</span>
        </Button>
      </div>
    </div>
  );
}
