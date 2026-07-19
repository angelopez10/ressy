'use client';

import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/** Placeholder: la integración real de Stripe/Mercado Pago es una sesión aparte. */
export function PaymentsTab() {
  const t = useTranslations('dashboard.settings.payments');

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-secondary text-sm">{t('subtitle')}</p>
      {[t('stripe'), t('mercadopago')].map((name) => (
        <Card key={name} className="flex items-center gap-4 p-4">
          <div className="bg-surface-alt text-ink-secondary flex size-11 items-center justify-center rounded-xl">
            <CreditCard className="size-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-ink font-semibold">{name}</div>
            <div className="text-ink-tertiary text-xs">{t('comingSoon')}</div>
          </div>
          <Button variant="secondary" size="sm" disabled>
            {t('connect')}
          </Button>
        </Card>
      ))}
    </div>
  );
}
