'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { cancelSubscription } from '@/lib/dashboard/subscription.actions';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/lib/plans/config';

/** Métrica de uso serializable (nada de Infinity: ilimitado ⇒ `unlimited: true`). */
export type UsageDTO = { used: number; limit: number | null; unlimited: boolean };

/** Estado del billing del plan, serializable, calculado en el server. */
export interface PlanBillingDTO {
  /** ¿Se puede contratar/cambiar online? (moneda CLP + billing configurado). */
  enabled: boolean;
  /** Baja programada al fin del período. */
  cancelAtPeriodEnd: boolean;
  /** Fin del período pagado (ISO UTC), si lo hay. */
  currentPeriodEnd: string | null;
}

export interface PlanTabProps {
  tier: PlanId;
  trial: { isTrial: boolean; daysLeft: number };
  bookings: UsageDTO;
  staff: UsageDTO;
  whatsapp: UsageDTO;
  billing: PlanBillingDTO;
}

/**
 * Tab de Plan (Ajustes): plan actual, trial, uso vs límites y cancelación. El
 * CAMBIO de plan vive en su propia pantalla ("Mejorar plan"), a la que enlaza el
 * botón. Los números vienen ya calculados del server (config + contadores DB).
 */
export function PlanTab({ tier, trial, bookings, staff, whatsapp, billing }: PlanTabProps) {
  const t = useTranslations('dashboard.settings.plan');
  const uiLocale = useLocale();
  const { toast } = useToast();
  const [cancelling, startCancel] = useTransition();

  const isPaid = tier !== 'free' && !trial.isTrial;
  const periodDate = billing.currentPeriodEnd
    ? new Intl.DateTimeFormat(uiLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(billing.currentPeriodEnd),
      )
    : null;

  function onCancel() {
    if (!confirm(t('billing.cancelConfirm', { plan: t(`names.${tier}`), date: periodDate ?? '—' }))) return;
    startCancel(async () => {
      const res = await cancelSubscription();
      if (res.ok) toast(t('billing.cancelled'));
      else toast(t('billing.error'), 'error');
    });
  }

  // Subtítulo del estado: trial / renueva / se cancela.
  let statusLine: string;
  if (trial.isTrial) statusLine = t('trialStatus', { days: trial.daysLeft });
  else if (billing.cancelAtPeriodEnd && periodDate) statusLine = t('billing.cancelsOn', { date: periodDate });
  else if (isPaid && periodDate) statusLine = t('billing.renewsOn', { date: periodDate });
  else statusLine = t('renews');

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-accent flex flex-col gap-5 border-2 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-ink text-xl font-bold">{t(`names.${tier}`)}</div>
            <div className="text-ink-secondary text-sm">{statusLine}</div>
          </div>
          <Badge tone={trial.isTrial ? 'warning' : billing.cancelAtPeriodEnd ? 'warning' : 'success'}>
            {trial.isTrial ? t('trialBadge') : t('current')}
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          <UsageBar label={t('usage.bookings')} usage={bookings} />
          <UsageBar label={t('usage.staff')} usage={staff} />
          <UsageBar label={t('usage.whatsapp')} usage={whatsapp} zeroLabel={t('notIncluded')} />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link href="/dashboard/upgrade">{t('upgrade')}</Link>
          </Button>
          {isPaid && !billing.cancelAtPeriodEnd && billing.enabled ? (
            <Button variant="secondary" onClick={onCancel} loading={cancelling}>
              {cancelling ? t('billing.cancelling') : t('billing.cancel')}
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function UsageBar({
  label,
  usage,
  zeroLabel,
}: {
  label: string;
  usage: UsageDTO;
  zeroLabel?: string;
}) {
  const t = useTranslations('dashboard.settings.plan');

  // Sin límite → "usados · ilimitado". Límite 0 (WhatsApp en Free) → no incluido.
  let valueLabel: string;
  let pct = 0;
  let over = false;
  if (usage.unlimited) {
    valueLabel = t('usage.ofUnlimited', { used: usage.used });
  } else if (usage.limit === 0) {
    valueLabel = zeroLabel ?? t('usage.of', { used: usage.used, limit: 0 });
  } else {
    const limit = usage.limit ?? 0;
    valueLabel = t('usage.of', { used: usage.used, limit });
    pct = Math.min(100, Math.round((usage.used / limit) * 100));
    over = usage.used >= limit;
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-ink-secondary">{label}</span>
        <span className={cn('font-medium', over ? 'text-warning' : 'text-ink')}>{valueLabel}</span>
      </div>
      {!usage.unlimited && usage.limit !== 0 ? (
        <div className="bg-surface-alt h-2 overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full', over ? 'bg-warning' : 'bg-accent')}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
