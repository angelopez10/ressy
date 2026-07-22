'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { savePolicies } from '@/lib/dashboard/settings.actions';
import type { PoliciesData } from '@/lib/dashboard/settings';

const field = 'flex flex-col gap-1.5';
const label = 'text-ink-secondary text-sm font-semibold';

export function PoliciesTab({ policies, currency }: { policies: PoliciesData; currency: string }) {
  const t = useTranslations('dashboard.settings');
  const tc = useTranslations('dashboard.actions');
  const { toast } = useToast();

  const [minLead, setMinLead] = useState(String(policies.minLeadTimeMin));
  const [maxAdvance, setMaxAdvance] = useState(String(policies.maxAdvanceDays));
  const [cancelWindow, setCancelWindow] = useState(String(policies.cancellationWindowHours));
  const [depositType, setDepositType] = useState(policies.depositType);
  const [depositValue, setDepositValue] = useState(
    String(policies.depositType === 'percent' ? (policies.depositPercent ?? 30) : (policies.depositAmount ?? 0)),
  );
  const [noShowFee, setNoShowFee] = useState(String(policies.noShowFeeAmount));
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await savePolicies({
      minLeadTimeMin: minLead,
      maxAdvanceDays: maxAdvance,
      cancellationWindowHours: cancelWindow,
      depositType,
      depositPercent: depositType === 'percent' ? Number(depositValue) : null,
      depositAmount: depositType === 'fixed' ? Number(depositValue) : null,
      noShowFeeAmount: noShowFee,
    });
    setLoading(false);
    if (res.ok) {
      toast(t('toast.saved'));
    } else {
      const key = res.error === 'depositPlan' || res.error === 'depositNoMp' ? res.error : 'generic';
      toast(t(`errors.${key}`), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-secondary bg-surface-alt rounded-input flex items-start gap-2 p-3 text-xs">
        <Info className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('policies.engineNote')}
      </p>

      <label className={field}>
        <span className={label}>{t('policies.minLead')}</span>
        <Input type="number" min={0} value={minLead} onChange={(e) => setMinLead(e.target.value)} />
        <span className="text-ink-tertiary text-xs">{t('policies.minLeadHint')}</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={field}>
          <span className={label}>{t('policies.maxAdvance')}</span>
          <Input type="number" min={1} value={maxAdvance} onChange={(e) => setMaxAdvance(e.target.value)} />
        </label>
        <label className={field}>
          <span className={label}>{t('policies.cancelWindow')}</span>
          <Input type="number" min={0} value={cancelWindow} onChange={(e) => setCancelWindow(e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={field}>
          <span className={label}>{t('policies.deposit')}</span>
          <Select value={depositType} onChange={(e) => setDepositType(e.target.value as PoliciesData['depositType'])}>
            <option value="none">{t('policies.depositNone')}</option>
            <option value="percent">{t('policies.depositPercent')}</option>
            <option value="fixed">{t('policies.depositFixed')}</option>
          </Select>
        </label>
        {depositType !== 'none' && (
          <label className={field}>
            <span className={label}>
              {depositType === 'percent' ? t('policies.depositPercentValue') : `${t('policies.depositFixedValue')} (${currency})`}
            </span>
            <Input type="number" min={0} value={depositValue} onChange={(e) => setDepositValue(e.target.value)} />
          </label>
        )}
      </div>

      <label className={field}>
        <span className={label}>{`${t('policies.noShowFee')} (${currency})`}</span>
        <Input type="number" min={0} value={noShowFee} onChange={(e) => setNoShowFee(e.target.value)} />
      </label>

      <div>
        <Button onClick={save} loading={loading}>
          {loading ? tc('saving') : tc('save')}
        </Button>
      </div>
    </div>
  );
}
