'use client';

import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DraftDay } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/**
 * Paso 3: horario semanal. Hora LOCAL del negocio (nunca UTC, CLAUDE.md §3). Cada
 * día se abre/cierra con el toggle; "copiar a toda la semana" replica el lunes.
 */
export function Step3Schedule({
  value,
  onChange,
  error,
}: {
  value: DraftDay[];
  onChange: (v: DraftDay[]) => void;
  error: string | null;
}) {
  const t = useTranslations('onboarding.step3');
  const td = useTranslations('onboarding.days');

  const update = (i: number, patch: Partial<DraftDay>) =>
    onChange(value.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  function copyMondayToAll() {
    const mon = value[0];
    if (!mon) return;
    onChange(
      value.map((d, i) =>
        i === 0 ? d : { ...d, open: mon.open, startTime: mon.startTime, endTime: mon.endTime },
      ),
    );
  }

  return (
    <div>
      <h1 className="text-ink text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1 mb-5">{t('subtitle')}</p>

      <button
        type="button"
        onClick={copyMondayToAll}
        className="text-accent hover:text-accent-hover text-small mb-4 flex items-center gap-1.5 font-semibold"
      >
        <Copy className="size-4" aria-hidden="true" />
        {t('copyMonday')}
      </button>

      <div className="flex flex-col gap-2">
        {value.map((d, i) => (
          <div
            key={d.weekday}
            className={cn(
              'border-border rounded-input flex items-center gap-3 border px-3 py-2.5',
              !d.open && 'bg-surface-alt',
            )}
          >
            <span
              className={cn(
                'text-small w-24 font-semibold',
                d.open ? 'text-ink' : 'text-ink-tertiary',
              )}
            >
              {td(DAY_KEYS[i]!)}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={d.open}
              aria-label={td(DAY_KEYS[i]!)}
              onClick={() => update(i, { open: !d.open })}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full border-2 transition-colors',
                d.open ? 'border-success bg-success' : 'border-border bg-surface',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-4 rounded-full bg-white transition-all',
                  d.open ? 'left-[22px]' : 'bg-ink-tertiary left-0.5',
                )}
              />
            </button>

            {d.open ? (
              <div className="flex flex-1 items-center gap-2">
                <TimeInput value={d.startTime} onChange={(v) => update(i, { startTime: v })} />
                <span className="text-ink-tertiary">–</span>
                <TimeInput value={d.endTime} onChange={(v) => update(i, { endTime: v })} />
              </div>
            ) : (
              <span className="text-ink-tertiary text-small flex-1">{t('closed')}</span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-warning text-small mt-4">
          {error === 'atLeastOneDay' ? t('errors.atLeastOneDay') : t('errors.generic')}
        </p>
      )}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-input border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 text-small h-10 border px-2 outline-none focus:ring-2"
    />
  );
}
