'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatPlanPrice,
  PLAN_ORDER,
  PLANS,
  priceFor,
  type BillingCycle,
  type Currency,
  type PlanId,
} from '@/lib/plans/config';

type TierCopy = { name: string; tagline: string; features: string[] };

/**
 * Paso 5 — elección de plan. Si eligen Free, se queda en el Team trial de 14 días
 * sin tarjeta (CLAUDE.md §1); si eligen un plan pago, al publicar se los manda al
 * checkout de MP para suscribirse. Precios/orden salen de config; el copy de i18n.
 */
export function Step5Plan({
  value,
  onChange,
  cycle,
  onCycleChange,
  currency,
}: {
  value: PlanId;
  onChange: (id: PlanId) => void;
  cycle: BillingCycle;
  onCycleChange: (c: BillingCycle) => void;
  /** Moneda del negocio (del paso 1). Cae a CLP si no es una que la config modela. */
  currency: string;
}) {
  const t = useTranslations('onboarding.plan');
  const tPricing = useTranslations('marketing.pricing');
  const uiLocale = useLocale();

  const cur: Currency = currency.toLowerCase() === 'usd' ? 'usd' : 'clp';
  const copy = tPricing.raw('tiers') as Record<PlanId, TierCopy>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-ink text-2xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-ink-secondary mt-1 text-sm">{t('subtitle')}</p>
      </div>

      {/* Toggle mensual / anual */}
      <div className="flex justify-center">
        <div
          className="border-border bg-surface rounded-button inline-flex items-center gap-1 border p-1"
          role="group"
        >
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCycleChange(c)}
              aria-pressed={cycle === c}
              className={cn(
                'rounded-button px-4 py-2 text-sm font-semibold transition-colors',
                cycle === c ? 'bg-ink text-white' : 'text-ink-secondary hover:text-ink',
              )}
            >
              {t(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const c = copy[id];
          if (!c) return null;
          const selected = id === value;
          const isFree = plan.pricing[cur].monthly === 0;
          const amount = priceFor(id, cur, cycle);

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={selected}
              className={cn(
                'rounded-card relative flex flex-col gap-3 border p-5 text-left transition-colors',
                selected ? 'border-accent border-2' : 'border-border hover:border-ink-tertiary',
              )}
            >
              {plan.popular ? (
                <span className="bg-accent absolute top-4 right-4 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  {tPricing('popular')}
                </span>
              ) : null}

              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                    selected ? 'border-accent' : 'border-ink-tertiary',
                  )}
                >
                  {selected ? <span className="bg-accent size-2.5 rounded-full" /> : null}
                </span>
                <div>
                  <div className="text-ink font-bold">{c.name}</div>
                  <div className="text-ink-secondary text-xs">{c.tagline}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-1">
                <span className="text-ink text-3xl font-extrabold tracking-tight">
                  {formatPlanPrice(amount, cur, uiLocale)}
                </span>
                <span className="text-ink-secondary text-sm">
                  {cur.toUpperCase()}
                  {!isFree ? (cycle === 'yearly' ? tPricing('perYear') : tPricing('perMonth')) : ''}
                </span>
              </div>

              <ul className="flex flex-col gap-1.5">
                {c.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="text-ink flex items-start gap-2 text-sm">
                    <Check className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
