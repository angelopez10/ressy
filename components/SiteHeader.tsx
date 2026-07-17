import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="border-border bg-surface border-b">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Link href="/" className="text-h3 text-ink font-extrabold tracking-tight">
          {t('common.brand')}
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/styleguide"
            className="text-small text-ink-secondary hover:text-ink hidden font-semibold transition-colors sm:block"
          >
            {t('nav.styleguide')}
          </Link>
          <Link
            href="/dashboard"
            className="text-small text-ink-secondary hover:text-ink hidden font-semibold transition-colors sm:block"
          >
            {t('nav.dashboard')}
          </Link>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
