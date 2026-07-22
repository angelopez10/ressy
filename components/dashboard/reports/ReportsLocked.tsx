'use client';

import { useTranslations } from 'next-intl';
import { BarChart3, Lock } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/dashboard/PageHeader';

/**
 * Estado bloqueado de Reportes para el plan Free (`reports: 'none'` en la fuente
 * de verdad de planes). No se calcula ni expone ninguna métrica: el gating real
 * vive en el server (la página ni siquiera consulta los datos), esto es solo el
 * upsell. CTA lleva al tab de Plan para mejorar.
 */
export function ReportsLocked() {
  const t = useTranslations('dashboard.reports');

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="bg-accent-soft text-accent flex size-12 items-center justify-center rounded-full">
          <Lock className="size-5" aria-hidden="true" />
        </div>
        <h2 className="text-h3 text-ink flex items-center gap-2">
          <BarChart3 className="text-ink-tertiary size-5" aria-hidden="true" />
          {t('locked.title')}
        </h2>
        <p className="text-ink-secondary max-w-sm text-sm">{t('locked.body')}</p>
        <Button asChild className="mt-1">
          <Link href="/dashboard/settings">{t('locked.cta')}</Link>
        </Button>
      </Card>
    </div>
  );
}
