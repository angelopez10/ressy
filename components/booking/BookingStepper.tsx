'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const STEP_KEYS = ['service', 'professional', 'datetime', 'details', 'done'] as const;

/**
 * Stepper numerado del desktop (mockup): círculos con número/label unidos por
 * líneas. El círculo activo va en acento; los completados con check. En móvil no
 * se usa (ahí va la barra segmentada dentro de la card).
 */
export function BookingStepper({
  currentIndex,
  onGoto,
}: {
  currentIndex: number;
  /** Volver a un paso ya completado (los futuros no son navegables). */
  onGoto?: (index: number) => void;
}) {
  const t = useTranslations('booking.steps');

  return (
    <ol className="flex items-start">
      {STEP_KEYS.map((key, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const clickable = done && Boolean(onGoto);
        return (
          <li key={key} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              {i > 0 && (
                <span
                  className={cn('h-0.5 flex-1', i <= currentIndex ? 'bg-accent' : 'bg-border')}
                />
              )}
              <span
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onGoto!(i) : undefined}
                onKeyDown={
                  clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onGoto!(i) : undefined
                }
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  (done || active) && 'bg-accent text-white',
                  !done && !active && 'border-border text-ink-tertiary border-2',
                  clickable && 'hover:bg-accent-hover cursor-pointer',
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              {i < STEP_KEYS.length - 1 && (
                <span
                  className={cn('h-0.5 flex-1', i < currentIndex ? 'bg-accent' : 'bg-border')}
                />
              )}
            </div>
            <span
              className={cn(
                'text-small mt-2 text-center font-semibold',
                active ? 'text-ink' : 'text-ink-tertiary',
                clickable && 'cursor-pointer',
              )}
              onClick={clickable ? () => onGoto!(i) : undefined}
            >
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
