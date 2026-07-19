'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STAFF_LIMIT } from '@/lib/dashboard/plan';
import type { Enums } from '@/lib/db/types';

const TIER_LABEL: Record<Enums<'subscription_tier'>, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

/** Estado del plan. La compra/upgrade real es una sesión de billing aparte (placeholder). */
export function PlanTab({ tier, staffCount }: { tier: Enums<'subscription_tier'>; staffCount: number }) {
  const t = useTranslations('dashboard.settings.plan');
  const limit = STAFF_LIMIT[tier];

  return (
    <Card className="border-accent flex flex-col gap-5 border-2 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-ink text-xl font-bold">{TIER_LABEL[tier]}</div>
          <div className="text-ink-secondary text-sm">{t('renews')}</div>
        </div>
        <Badge tone="success">{t('current')}</Badge>
      </div>

      <div>
        <div className="text-ink-secondary mb-1.5 text-sm">{t('staffUsage', { used: staffCount, limit })}</div>
        <div className="bg-surface-alt h-2 overflow-hidden rounded-full">
          <div
            className="bg-accent h-full rounded-full"
            style={{ width: `${Math.min(100, (staffCount / limit) * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {/* Billing real = sesión aparte; por ahora solo el CTA. */}
        <Button disabled>{t('upgrade')}</Button>
        <Button variant="secondary" disabled>
          {t('invoices')}
        </Button>
      </div>
    </Card>
  );
}
