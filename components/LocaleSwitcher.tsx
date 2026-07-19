'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { routing, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Toggle ES/EN. `usePathname` de next-intl devuelve la ruta ya sin el prefijo
 * de locale, así que basta con re-navegar a la misma ruta con el otro idioma:
 * funciona igual en `/es/styleguide` que en `/es/mi-negocio`.
 */
export function LocaleSwitcher({
  className,
  tone = 'accent',
}: {
  className?: string;
  /** 'accent' (default, marketing) = activo en teal suave; 'solid' = activo en ink (booking). */
  tone?: 'accent' | 'solid';
}) {
  const t = useTranslations('common.localeSwitcher');
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelect(nextLocale: Locale) {
    if (nextLocale === activeLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div
      className={cn(
        'rounded-button border-border inline-flex items-center gap-1 border p-1',
        isPending && 'opacity-60',
        className,
      )}
      role="group"
      aria-label={t('label')}
    >
      {tone !== 'solid' && (
        <Languages className="text-ink-secondary ml-2 size-5" aria-hidden="true" />
      )}
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onSelect(locale)}
          aria-current={locale === activeLocale ? 'true' : undefined}
          className={cn(
            'rounded-button px-3 py-1 text-sm font-semibold transition-colors',
            locale === activeLocale
              ? tone === 'solid'
                ? 'bg-ink text-white'
                : 'bg-accent-soft text-accent'
              : 'text-ink-secondary hover:text-ink',
          )}
        >
          {t(locale)}
        </button>
      ))}
    </div>
  );
}
