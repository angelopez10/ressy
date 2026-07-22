'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { saveService } from '@/lib/dashboard/services.actions';
import type { ServiceDTO, StaffOption } from '@/lib/dashboard/services';
import { useIsMobile } from '@/components/dashboard/calendar/useIsMobile';
import { cn } from '@/lib/utils';

const field = 'flex flex-col gap-1.5';
const label = 'text-ink-secondary text-sm font-semibold';

export function ServiceFormModal({
  service,
  staff,
  currency,
  onClose,
  onSaved,
}: {
  service: ServiceDTO | null;
  staff: StaffOption[];
  currency: string;
  onClose: () => void;
  onSaved: (created: boolean) => void;
}) {
  const t = useTranslations('dashboard.services');
  const te = useTranslations('dashboard.services.errors');
  const tc = useTranslations('dashboard.actions');
  const isMobile = useIsMobile();

  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [durationMin, setDurationMin] = useState(String(service?.durationMin ?? 30));
  const [priceAmount, setPriceAmount] = useState(String(service?.priceAmount ?? 0));
  const [bufferBefore, setBufferBefore] = useState(String(service?.bufferBeforeMin ?? 0));
  const [bufferAfter, setBufferAfter] = useState(String(service?.bufferAfterMin ?? 0));
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [staffIds, setStaffIds] = useState<string[]>(service?.staffIds ?? staff.map((s) => s.id));
  const [depositOverride, setDepositOverride] = useState(service?.depositOverride ?? 'inherit');
  const [depositValue, setDepositValue] = useState(
    String(
      service?.depositOverride === 'percent'
        ? (service.depositPercent ?? 30)
        : service?.depositOverride === 'fixed'
          ? (service.depositAmount ?? 0)
          : 30,
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleStaff(id: string) {
    setStaffIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await saveService({
      id: service?.id,
      name,
      description,
      durationMin,
      priceAmount,
      bufferBeforeMin: bufferBefore,
      bufferAfterMin: bufferAfter,
      isActive,
      staffIds,
      depositOverride,
      depositPercent: depositOverride === 'percent' ? Number(depositValue) : null,
      depositAmount: depositOverride === 'fixed' ? Number(depositValue) : null,
    });
    setLoading(false);
    if (res.ok) onSaved(!service);
    else setError(te(errKey(res.error)));
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={service ? t('form.editTitle') : t('form.createTitle')}>
      <ModalHeader title={service ? t('form.editTitle') : t('form.createTitle')} onClose={onClose} closeLabel={tc('close')} />
      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        <label className={field}>
          <span className={label}>{t('form.name')}</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.namePlaceholder')} />
        </label>
        <label className={field}>
          <span className={label}>{t('form.description')}</span>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('form.descriptionPlaceholder')} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={field}>
            <span className={label}>{t('form.duration')}</span>
            <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </label>
          <label className={field}>
            <span className={label}>{t('form.price')}</span>
            <Input type="number" min={0} value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
            <span className="text-ink-tertiary text-xs">{t('form.priceHint', { currency })}</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={field}>
            <span className={label}>{t('form.bufferBefore')}</span>
            <Input type="number" min={0} step={5} value={bufferBefore} onChange={(e) => setBufferBefore(e.target.value)} />
          </label>
          <label className={field}>
            <span className={label}>{t('form.bufferAfter')}</span>
            <Input type="number" min={0} step={5} value={bufferAfter} onChange={(e) => setBufferAfter(e.target.value)} />
          </label>
        </div>

        {/* Anticipo por servicio: pisa el default del negocio (migración 14). */}
        <div className="grid grid-cols-2 gap-3">
          <label className={field}>
            <span className={label}>{t('form.deposit')}</span>
            <Select
              value={depositOverride}
              onChange={(e) => setDepositOverride(e.target.value as ServiceDTO['depositOverride'])}
            >
              <option value="inherit">{t('form.depositInherit')}</option>
              <option value="none">{t('form.depositNone')}</option>
              <option value="percent">{t('form.depositPercent')}</option>
              <option value="fixed">{t('form.depositFixed')}</option>
            </Select>
            <span className="text-ink-tertiary text-xs">{t('form.depositHint')}</span>
          </label>
          {(depositOverride === 'percent' || depositOverride === 'fixed') && (
            <label className={field}>
              <span className={label}>
                {depositOverride === 'percent' ? t('form.depositPercentValue') : `${t('form.depositFixedValue')} (${currency})`}
              </span>
              <Input type="number" min={0} value={depositValue} onChange={(e) => setDepositValue(e.target.value)} />
            </label>
          )}
        </div>

        {staff.length > 0 && (
          <div className={field}>
            <span className={label}>{t('form.staff')}</span>
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => {
                const on = staffIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStaff(s.id)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-secondary',
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <label className="border-border flex items-center justify-between rounded-input border px-4 py-3">
          <span className="text-ink text-sm font-medium">{t('form.active')}</span>
          <Switch checked={isActive} onChange={setIsActive} label={t('form.active')} />
        </label>

        {error && <p className="text-warning text-sm">{error}</p>}

        <Button onClick={submit} loading={loading} disabled={!name.trim()}>
          {loading ? tc('saving') : tc('save')}
        </Button>
      </div>
    </Modal>
  );
}

function errKey(e: string): string {
  const known = ['nameRequired', 'durationRequired', 'priceInvalid', 'staffRequired', 'depositPlan', 'depositNoMp'];
  return known.includes(e) ? e : 'generic';
}
