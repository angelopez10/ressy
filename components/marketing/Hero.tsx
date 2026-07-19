import { useTranslations } from 'next-intl';
import { CalendarCheck, CheckCircle2, PlayCircle } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';

/**
 * Hero de la landing. Único `h1` de la página. A la derecha, el slot del producto:
 * una captura real reemplaza el placeholder (ver ProductShot); encima, una card
 * flotante de "nueva reserva" tomada del mockup.
 */
export function Hero() {
  const t = useTranslations('marketing.hero');

  return (
    <section className="container-page grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div>
        <span className="bg-accent-soft text-accent-hover mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold">
          <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
          {t('pill')}
        </span>

        <h1 className="text-display text-ink text-balance">{t('title')}</h1>

        <p className="text-ink-secondary mt-5 max-w-xl text-lg leading-relaxed text-pretty">
          {t('subtitle')}
        </p>

        <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
          <Button size="lg" asChild>
            <Link href="/onboarding">{t('cta')}</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href="#how-it-works">
              <PlayCircle aria-hidden="true" />
              {t('secondaryCta')}
            </a>
          </Button>
        </div>

        <p className="text-ink-tertiary mt-4 flex items-center gap-2 text-sm">
          <CheckCircle2 className="text-success size-4 shrink-0" aria-hidden="true" />
          {t('micro')}
        </p>
      </div>

      <div className="relative">
        {/* Slot de producto: sustituir por una captura real de la booking page.
            Ver components/marketing/ProductShot.tsx para el punto de reemplazo. */}
        <div className="shadow-card border-border aspect-[4/3] overflow-hidden rounded-3xl border">
          <ProductShot alt={t('imageAlt')} />
        </div>

        <div className="border-border bg-surface shadow-card absolute -bottom-5 -left-4 flex items-center gap-3 rounded-2xl border p-4 sm:-left-5">
          <span className="text-success flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,138,5,0.12)]">
            <CalendarCheck className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="text-ink block text-sm font-bold">{t('cardTitle')}</span>
            <span className="text-ink-secondary block text-xs">{t('cardSub')}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Placeholder del mockup del producto. Cuando exista una captura real de la
 * booking page o el dashboard, colócala en `public/` y reemplaza este bloque por
 * un `next/image` con el mismo `aspect-[4/3]` y `alt={alt}`.
 */
function ProductShot({ alt }: { alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="bg-surface-alt text-ink-tertiary flex size-full flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <CalendarCheck className="size-10" aria-hidden="true" />
      <span className="text-small max-w-[220px]">{alt}</span>
    </div>
  );
}
