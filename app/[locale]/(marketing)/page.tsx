import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Props = { params: Promise<{ locale: string }> };

export default async function MarketingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Hero />;
}

function Hero() {
  const t = useTranslations('marketing');

  return (
    <section className="container-page flex flex-col items-center py-24 text-center sm:py-32">
      <Badge tone="accent">{t('badge')}</Badge>

      <h1 className="text-display text-ink mt-6 max-w-3xl text-balance">{t('title')}</h1>

      <p className="text-body text-ink-secondary mt-6 max-w-xl text-pretty">{t('subtitle')}</p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Button size="lg" asChild>
          <Link href="/dashboard">
            {t('cta')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button size="lg" variant="ghost" asChild>
          <Link href="/styleguide">{t('secondaryCta')}</Link>
        </Button>
      </div>

      <p className="text-small text-ink-tertiary mt-16">{t('comingSoon')}</p>
    </section>
  );
}
