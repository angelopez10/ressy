'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';

/**
 * Precios base en USD (unidad mayor, solo para display en la landing). El id fija
 * el orden y qué card es la destacada; el copy (tagline, features) sale de i18n.
 * Anual = 10× el mensual (2 meses gratis), redondeado — coincide con el mockup.
 */
const TIERS = [
  { id: 'free', monthly: 0, popular: false },
  { id: 'starter', monthly: 12, popular: false },
  { id: 'pro', monthly: 29, popular: true },
  { id: 'business', monthly: 69, popular: false },
] as const;

type TierCopy = { name: string; tagline: string; features: string[] };

export function PricingSection() {
  const t = useTranslations('marketing.pricing');
  const [yearly, setYearly] = useState(false);
  const tiers = t.raw('tiers') as TierCopy[];

  const price = (monthly: number) => {
    if (monthly === 0) return '$0';
    return `$${yearly ? monthly * 10 : monthly}`;
  };
  const suffix = (monthly: number) => {
    if (monthly === 0) return '';
    return yearly ? t('perYear') : t('perMonth');
  };

  return (
    <section id="pricing" className="bg-surface-alt border-border border-y py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-8" />

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
          {TIERS.map((tier, i) => {
            const copy = tiers[i];
            if (!copy) return null;
            return (
              <Card
                key={tier.id}
                className={cn(
                  'relative flex h-full flex-col p-7',
                  tier.popular && 'border-accent shadow-card border-2',
                )}
              >
                {tier.popular ? (
                  <span className="bg-accent absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-xs font-bold whitespace-nowrap text-white">
                    {t('popular')}
                  </span>
                ) : null}

                <div className="text-ink text-lg font-bold">{copy.name}</div>
                <div className="text-ink-secondary mb-4 text-sm">{copy.tagline}</div>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-ink text-4xl font-extrabold tracking-tight">
                    {price(tier.monthly)}
                  </span>
                  <span className="text-ink-secondary text-sm">{suffix(tier.monthly)}</span>
                </div>

                <Button
                  variant={tier.popular ? 'primary' : 'secondary'}
                  className="mb-6 w-full"
                  asChild
                >
                  <Link href="/onboarding">{t('cta')}</Link>
                </Button>

                <ul className="flex flex-col gap-2.5">
                  {copy.features.map((feature) => (
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
