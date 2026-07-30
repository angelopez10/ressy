'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  formatPlanPrice,
  PLAN_ORDER,
  PLANS,
  priceFor,
  type Currency,
  type PlanId,
} from '@/lib/plans/config';
import { SectionHeading } from './SectionHeading';

/**
 * Cards de pricing. Precios, orden y card destacada salen de lib/plans/config.ts
 * (fuente de verdad única); el copy (nombre, tagline, bullets) sale de i18n.
 *
 * Moneda: CLP en todos los locales por ahora (mercado principal LATAM/Chile).
 * La config trae también los precios USD; soportar por región es cambiar esta
 * constante por una detección cuando el routing exponga la señal de país.
 */
const CURRENCY: Currency = 'clp';

type TierCopy = { name: string; tagline: string; features: string[] };

export function PricingSection() {
  const t = useTranslations('marketing.pricing');
  const locale = useLocale();
  const [yearly, setYearly] = useState(false);
  const copy = t.raw('tiers') as Record<PlanId, TierCopy>;

  const priceLabel = (id: PlanId) =>
    formatPlanPrice(priceFor(id, CURRENCY, yearly ? 'yearly' : 'monthly'), CURRENCY, locale);

  return (
    <section id="pricing" className="bg-surface-alt border-border border-y py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-4" />
        <p className="text-ink-secondary mx-auto mb-8 max-w-md text-center text-sm">{t('trial')}</p>

        {/* Toggle mensual / anual */}
        <div className="mb-11 flex justify-center">
          <div
            className="border-border bg-surface rounded-button inline-flex items-center gap-1 border p-1"
            role="group"
            aria-label={t('title')}
          >
            <button
              type="button"
              onClick={() => setYearly(false)}
              aria-pressed={!yearly}
              className={cn(
                'rounded-button px-4 py-2 text-sm font-semibold transition-colors',
                yearly ? 'text-ink-secondary hover:text-ink' : 'bg-ink text-white',
              )}
            >
              {t('monthly')}
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              aria-pressed={yearly}
              className={cn(
                'rounded-button px-4 py-2 text-sm font-semibold transition-colors',
                yearly ? 'bg-ink text-white' : 'text-ink-secondary hover:text-ink',
              )}
            >
              {t('yearly')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const c = copy[id];
            if (!c) return null;
            const isFree = plan.pricing[CURRENCY].monthly === 0;
            return (
              <Card
                key={id}
                className={cn(
                  'relative flex h-full flex-col p-7',
                  plan.popular && 'border-accent shadow-card border-2',
                )}
              >
                {plan.popular ? (
                  <span className="bg-accent absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-xs font-bold whitespace-nowrap text-white">
                    {t('popular')}
                  </span>
                ) : null}

                <div className="text-ink text-lg font-bold">{c.name}</div>
                <div className="text-ink-secondary mb-4 text-sm">{c.tagline}</div>

                {/* Moneda y ciclo van bajo el monto: "29.900 CLP /año" en una sola
                    línea desborda la card en el grid de 4 columnas. */}
                <div className="mb-5">
                  <div className="text-ink text-4xl font-extrabold tracking-tight">
                    {priceLabel(id)}
                  </div>
                  <div className="text-ink-secondary text-sm">
                    {CURRENCY.toUpperCase()}
                    {!isFree ? (yearly ? t('perYear') : t('perMonth')) : ''}
                  </div>
                </div>

                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="mb-6 w-full"
                  asChild
                >
                  <Link href="/onboarding">{t('cta')}</Link>
                </Button>

                <ul className="flex flex-col gap-2.5">
                  {c.features.map((feature) => (
                    <li key={feature} className="text-ink flex items-start gap-2.5 text-sm">
                      <Check className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
