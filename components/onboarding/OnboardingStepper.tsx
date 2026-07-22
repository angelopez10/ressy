'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const KEYS = ['business', 'services', 'schedule', 'page', 'plan', 'done'] as const;

/** Stepper del wizard (6 pasos). Círculo hecho = ink, actual = acento, futuro = borde. */
export function OnboardingStepper({ currentIndex }: { currentIndex: number }) {
  const t = useTranslations('onboarding.steps');

  return (
    <ol className="flex items-start">
      {KEYS.map((key, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={key} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              {i > 0 && (
                <span className={cn('h-0.5 flex-1', i <= currentIndex ? 'bg-ink' : 'bg-border')} />
              )}
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  done && 'bg-ink text-white',
                  active && 'bg-accent text-white',
                  !done && !active && 'border-border text-ink-tertiary border',
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              {i < KEYS.length - 1 && (
                <span className={cn('h-0.5 flex-1', i < currentIndex ? 'bg-ink' : 'bg-border')} />
              )}
            </div>
            <span
              className={cn(
                'sm:text-small mt-2 text-center text-xs font-semibold',
                active ? 'text-ink' : 'text-ink-tertiary',
              )}
            >
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
