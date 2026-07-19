import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';

/** Banda de cierre en fondo ink. */
export function FinalCta() {
  const t = useTranslations('marketing');
  const cta = useTranslations('marketing.finalCta');
  const micro = t('hero.micro');

  return (
    <section className="container-page py-20 sm:py-24">
      <div className="bg-ink rounded-modal px-6 py-16 text-center sm:px-10 sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-balance text-white sm:text-4xl">
          {cta('title')}
        </h2>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/onboarding">{cta('cta')}</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-white/60">{micro}</p>
      </div>
    </section>
  );
}
