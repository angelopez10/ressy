'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { cn } from '@/lib/utils';
import { Wordmark } from './Wordmark';

/**
 * Navbar de la landing (mockup RessyLanding). Sticky con blur; gana un borde/sombra
 * sutil al hacer scroll. En móvil colapsa los links y el toggle de idioma en un menú.
 *
 * Client component solo por dos interacciones: el estado de scroll y el menú móvil.
 * El resto del texto viene de `marketing.nav`.
 */
export function MarketingNav() {
  const t = useTranslations('marketing.nav');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur transition-colors',
        scrolled ? 'border-border bg-surface/85' : 'border-transparent bg-surface/70',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Ressy" onClick={() => setMenuOpen(false)}>
          <Wordmark />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-small text-ink-secondary hover:text-ink font-medium transition-colors"
          >
            {t('features')}
          </a>
          <a
            href="#pricing"
            className="text-small text-ink-secondary hover:text-ink font-medium transition-colors"
          >
            {t('pricing')}
          </a>
          <LocaleSwitcher />
          <Link
            href="/login"
            className="text-small text-ink-secondary hover:text-ink font-medium transition-colors"
          >
            {t('login')}
          </Link>
          <Button size="sm" asChild>
            <Link href="/onboarding">{t('cta')}</Link>
          </Button>
        </div>

        {/* Mobile trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <Button size="sm" asChild>
            <Link href="/onboarding">{t('cta')}</Link>
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={t('menu')}
            className="text-ink -mr-1 inline-flex size-10 items-center justify-center"
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      {menuOpen ? (
        <div className="border-border bg-surface border-t md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="text-body text-ink hover:bg-surface-alt rounded-input px-2 py-3 font-medium"
            >
              {t('features')}
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="text-body text-ink hover:bg-surface-alt rounded-input px-2 py-3 font-medium"
            >
              {t('pricing')}
            </a>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-body text-ink hover:bg-surface-alt rounded-input px-2 py-3 font-medium"
            >
              {t('login')}
            </Link>
            <div className="px-2 pt-2">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
