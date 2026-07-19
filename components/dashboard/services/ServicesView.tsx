'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Pencil, Plus, Scissors, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { formatMoney } from '@/lib/db/mappers';
import { setServiceActive, reorderServices } from '@/lib/dashboard/services.actions';
import type { ServiceDTO, StaffOption } from '@/lib/dashboard/services';
import { cn } from '@/lib/utils';
import { ServiceFormModal } from './ServiceFormModal';

export function ServicesView({
  services,
  staff,
  currency,
  locale,
}: {
  services: ServiceDTO[];
  staff: StaffOption[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations('dashboard.services');
  const tc = useTranslations('dashboard.actions');
  const router = useRouter();
  const { toast } = useToast();

  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmOff, setConfirmOff] = useState<ServiceDTO | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleActive(svc: ServiceDTO) {
    setBusy(true);
    const res = await setServiceActive(svc.id, !svc.isActive);
    setBusy(false);
    setConfirmOff(null);
    if (res.ok) {
      toast(svc.isActive ? t('toast.deactivated') : t('toast.activated'));
      router.refresh();
    } else {
      toast(t('errors.generic'), 'error');
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= services.length) return;
    const ids = services.map((s) => s.id);
    [ids[index], ids[next]] = [ids[next]!, ids[index]!];
    const res = await reorderServices(ids);
    if (res.ok) {
      toast(t('toast.reordered'));
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            {t('newService')}
          </Button>
        }
      />

      {services.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Scissors className="text-ink-tertiary size-8" aria-hidden="true" />
          <h2 className="text-h3 text-ink">{t('empty.title')}</h2>
          <p className="text-ink-secondary max-w-sm text-sm">{t('empty.body')}</p>
          <Button className="mt-2" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            {t('newService')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((svc, i) => (
            <Card key={svc.id} className={cn('flex items-center gap-4 p-5', !svc.isActive && 'opacity-60')}>
              <div className="bg-accent-soft text-accent-hover flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Scissors className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate font-semibold">{svc.name}</div>
                <div className="text-ink-secondary mt-0.5 flex items-center gap-1.5 text-xs">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t('minutes', { count: svc.durationMin })} · {formatMoney(svc.priceAmount, currency, locale)}
                  {svc.staffIds.length > 0 && <> · {t('staffCount', { count: svc.staffIds.length })}</>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => (svc.isActive ? setConfirmOff(svc) : toggleActive(svc))}
                className={cn(
                  'text-xs font-semibold hover:underline',
                  svc.isActive ? 'text-success' : 'text-ink-tertiary',
                )}
              >
                {svc.isActive ? t('active') : t('hidden')}
              </button>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="↑"
                  className="text-ink-tertiary hover:text-ink disabled:opacity-30"
                >
                  <ChevronUp className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === services.length - 1}
                  aria-label="↓"
                  className="text-ink-tertiary hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditing(svc)}>
                <Pencil aria-hidden="true" />
                <span className="hidden sm:inline">{tc('edit')}</span>
              </Button>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ServiceFormModal
          service={editing}
          staff={staff}
          currency={currency}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(created) => {
            setCreating(false);
            setEditing(null);
            toast(created ? t('toast.created') : t('toast.updated'));
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOff !== null}
        title={t('confirm.deactivateTitle')}
        body={t('confirm.deactivateBody')}
        confirmLabel={tc('deactivate')}
        cancelLabel={tc('cancel')}
        loading={busy}
        onConfirm={() => confirmOff && toggleActive(confirmOff)}
        onCancel={() => setConfirmOff(null)}
      />
    </div>
  );
}
