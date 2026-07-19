import { useTranslations } from 'next-intl';
import { Instagram, Linkedin } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Wordmark } from './Wordmark';

/** Enlaces sociales de Ressy (CLAUDE.md / prompt 05). */
const SOCIAL = [
  { key: 'instagram', href: 'https://instagram.com/get.ressy', Icon: Instagram },
  { key: 'linkedin', href: 'https://linkedin.com/company/get-ressy', Icon: Linkedin },
] as const;

/** Ícono de X (Twitter): Lucide no lo trae, así que va como SVG inline. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.214-6.817-5.966 6.817H1.69l7.73-8.835L1.254 2.25h6.82l4.713 6.231 5.457-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

export function MarketingFooter() {
  const t = useTranslations('marketing.footer');
  const nav = useTranslations('marketing.nav');
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t py-12">
      <div className="container-page flex flex-col items-center gap-8 md:flex-row md:justify-between">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Wordmark size={30} />
          <p className="text-ink-tertiary text-sm">{t('tagline')}</p>
        </div>

        <nav className="flex items-center gap-6" aria-label={t('product')}>
          <a href="#features" className="text-small text-ink-secondary hover:text-ink font-medium">
            {nav('features')}
          </a>
          <a href="#pricing" className="text-small text-ink-secondary hover:text-ink font-medium">
            {nav('pricing')}
          </a>
          <Link href="/login" className="text-small text-ink-secondary hover:text-ink font-medium">
            {nav('login')}
          </Link>
        </nav>

        <div className="flex items-center gap-5">
          {SOCIAL.map(({ key, href, Icon }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={t(`social.${key}`)}
              className="text-ink-secondary hover:text-ink transition-colors"
            >
              <Icon className="size-5" />
            </a>
          ))}
          <a
            href="https://x.com/get_ressy"
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('social.x')}
            className="text-ink-secondary hover:text-ink transition-colors"
          >
            <XIcon className="size-[18px]" />
          </a>
        </div>
      </div>

      <div className="container-page mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-ink-tertiary text-sm">{t('rights', { year })}</p>
        <LocaleSwitcher />
      </div>
    </footer>
  );
}
