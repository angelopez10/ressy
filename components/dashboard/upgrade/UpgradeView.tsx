'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { PLAN_ORDER, PLANS, priceFor, type BillingCycle, type Currency, type PlanId } from '@/lib/plans/config';
import {
  cancelSubscription,
  reconcileSubscription,
  startSubscriptionUpgrade,
} from '@/lib/dashboard/subscription.actions';

/** Moneda de display (CLP por ahora, igual que la landing). */
const CURRENCY: Currency = 'clp';

type TierCopy = { name: string; tagline: string; features: string[] };

/**
 * Pantalla "Mejora tu plan" (mockup del dashboard): grid de las 4 cards con el
 * plan actual destacado ("Tu plan" + "Plan actual"). Contrata de verdad vía las
 * server actions; los datos (precio/orden/límites) salen de lib/plans/config.ts y
 * el copy (nombre/tagline/features) de i18n — nada hardcodeado.
 */
export function UpgradeView({
  currentTier,
  billingEnabled,
  locale,
  justReturned,
}: {
  currentTier: PlanId;
  billingEnabled: boolean;
  locale: string;
  justReturned: boolean;
}) {
  const t = useTranslations('dashboard.upgrade');
  const tPlan = useTranslations('dashboard.settings.plan');
  const tPricing = useTranslations('marketing.pricing');
  const uiLocale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<PlanId | null>(null);

  const copy = tPricing.raw('tiers') as Record<PlanId, TierCopy>;

  // Al volver del checkout, reconciliamos con MP y refrescamos (no dependemos del
  // webhook, poco fiable en sandbox). Una sola vez por montaje.
  const reconciled = useRef(false);
  useEffect(() => {
    if (!justReturned || reconciled.current) return;
    reconciled.current = true;
    reconcileSubscription().then((r) => {
      if (r.ok) router.refresh();
    });
  }, [justReturned, router]);

  const fmt = new Intl.NumberFormat(uiLocale, {
    style: 'currency',
    currency: CURRENCY.toUpperCase(),
    maximumFractionDigits: 0,
  });

  function choose(id: PlanId) {
    if (!billingEnabled) {
      toast(tPlan('billing.unavailable'), 'error');
      return;
    }
    setTarget(id);
    startTransition(async () => {
      // Free = bajar de plan (cancelar). Pagos = contratar/cambiar en MP.
      if (id === 'free') {
        const res = await cancelSubscription();
        if (res.ok) {
          toast(tPlan('billing.cancelled'));
          router.refresh();
        } else {
          toast(tPlan('billing.error'), 'error');
        }
        setTarget(null);
        return;
      }
      const res = await startSubscriptionUpgrade(id, cycle, locale);
      if (res.ok) {
        toast(tPlan('billing.redirecting'));
        window.location.href = res.checkoutUrl;
      } else {
        toast(tPlan('billing.error'), 'error');
        setTarget(null);
      }
    });
  }

  const subtitle =
    currentTier === 'free'
      ? t('subtitleFree')
      : t('subtitle', { plan: tPlan(`names.${currentTier}`) });

  return (
    <div>
      <PageHeader title={t('title')} subtitle={subtitle} />

      {/* Toggle mensual / anual (preserva el plan anual). */}
      <div className="mb-8 flex">
        <div
          className="border-border bg-surface rounded-button inline-flex items-center gap-1 border p-1"
          role="group"
        >
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              aria-pressed={cycle === c}
              className={cn(
                'rounded-button px-4 py-2 text-sm font-semibold transition-colors',
                cycle === c ? 'bg-ink text-white' : 'text-ink-secondary hover:text-ink',
              )}
            >
              {tPlan(`billing.${c}`)}
              {c === 'yearly' ? (
                <span className="text-accent ml-1.5 text-xs">· {tPlan('billing.yearlyHint')}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const c = copy[id];
          if (!c) return null;
          const isCurrent = id === currentTier;
          const isFree = plan.pricing[CURRENCY].monthly === 0;
          const amount = priceFor(id, CURRENCY, cycle);

          return (
            <Card
              key={id}
              className={cn(
                'relative flex h-full flex-col p-6',
                isCurrent && 'border-accent border-2',
              )}
            >
              {isCurrent ? (
                <span className="bg-accent absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-xs font-bold whitespace-nowrap text-white">
                  {tPlan('billing.yourPlan')}
                </span>
              ) : null}

              <div className="text-ink text-lg font-bold">{c.name}</div>
              <div className="text-ink-secondary mb-4 text-sm">{c.tagline}</div>

              <div className="mb-5 flex items-baseline gap-1">
                <span className="text-ink text-4xl font-extrabold tracking-tight">{fmt.format(amount)}</span>
                {!isFree ? (
                  <span className="text-ink-secondary text-sm">
                    {cycle === 'yearly' ? tPlan('billing.perYear') : tPlan('billing.perMonth')}
                  </span>
                ) : null}
              </div>

              <Button
                variant={isCurrent ? 'secondary' : plan.popular ? 'primary' : 'secondary'}
                className="mb-6 w-full"
                disabled={isCurrent || pending}
                loading={pending && target === id}
                onClick={() => choose(id)}
              >
                {isCurrent ? tPlan('billing.currentPlan') : tPlan('billing.select')}
              </Button>

              <ul className="flex flex-col gap-2.5">
                {c.features.slice(0, 2).map((feature) => (
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

      {!billingEnabled ? (
        <p className="text-ink-tertiary mt-6 text-center text-sm">{tPlan('billing.unavailable')}</p>
      ) : null}
    </div>
  );
}
