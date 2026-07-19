'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { saveNotificationSettings } from '@/lib/dashboard/notifications.actions';
import type { NotifSettingsDTO } from '@/lib/dashboard/notifications';
import type { Enums } from '@/lib/db/types';

function Row({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <div>
        <span className="text-ink text-sm font-medium">{label}</span>
        {hint && <p className="text-ink-tertiary text-xs">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

export function NotificationsTab({ settings, tier }: { settings: NotifSettingsDTO; tier: Enums<'subscription_tier'> }) {
  const t = useTranslations('dashboard.settings.notifications');
  const ts = useTranslations('dashboard.settings');
  const tc = useTranslations('dashboard.actions');
  const { toast } = useToast();

  const [s, setS] = useState(settings);
  const [loading, setLoading] = useState(false);
  const isFree = tier === 'free';

  const set = <K extends keyof NotifSettingsDTO>(k: K, v: NotifSettingsDTO[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setLoading(true);
    const res = await saveNotificationSettings({ ...s, whatsappEnabled: isFree ? false : s.whatsappEnabled });
    setLoading(false);
    if (res.ok) toast(ts('toast.saved'));
    else toast(ts('errors.generic'), 'error');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cliente */}
      <section>
        <h2 className="text-ink mb-1 text-base font-semibold">{t('clientTitle')}</h2>
        <div className="flex flex-col">
          <Row label={t('confirmation')} checked={s.confirmationEnabled} onChange={(v) => set('confirmationEnabled', v)} />
          <div className="border-border border-b py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink text-sm font-medium">{t('reminder1')}</span>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={String(s.reminder1Hours)} onChange={(e) => set('reminder1Hours', Number(e.target.value))} className="h-9 w-20" disabled={!s.reminder1Enabled} />
                <span className="text-ink-secondary text-xs">{t('hoursBefore')}</span>
                <Switch checked={s.reminder1Enabled} onChange={(v) => set('reminder1Enabled', v)} label={t('reminder1')} />
              </div>
            </div>
          </div>
          <div className="border-border border-b py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink text-sm font-medium">{t('reminder2')}</span>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={String(s.reminder2Hours)} onChange={(e) => set('reminder2Hours', Number(e.target.value))} className="h-9 w-20" disabled={!s.reminder2Enabled} />
                <span className="text-ink-secondary text-xs">{t('hoursBefore')}</span>
                <Switch checked={s.reminder2Enabled} onChange={(v) => set('reminder2Enabled', v)} label={t('reminder2')} />
              </div>
            </div>
            <p className="text-ink-tertiary mt-1 text-xs">{t('singleReminderHint')}</p>
          </div>
          <Row label={t('rescheduled')} checked={s.rescheduledEnabled} onChange={(v) => set('rescheduledEnabled', v)} />
          <Row label={t('cancelled')} checked={s.cancelledEnabled} onChange={(v) => set('cancelledEnabled', v)} />
        </div>
      </section>

      {/* Negocio */}
      <section>
        <h2 className="text-ink mb-1 text-base font-semibold">{t('businessTitle')}</h2>
        <div className="flex flex-col">
          <Row label={t('businessNew')} checked={s.businessNewBookingEnabled} onChange={(v) => set('businessNewBookingEnabled', v)} />
          <Row label={t('businessCancel')} checked={s.businessCancellationEnabled} onChange={(v) => set('businessCancellationEnabled', v)} />
          <div className="border-border border-b py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink text-sm font-medium">{t('dailySummary')}</span>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={23} value={String(s.dailySummaryHour)} onChange={(e) => set('dailySummaryHour', Number(e.target.value))} className="h-9 w-20" disabled={!s.dailySummaryEnabled} />
                <Switch checked={s.dailySummaryEnabled} onChange={(v) => set('dailySummaryEnabled', v)} label={t('dailySummary')} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Canales */}
      <section>
        <h2 className="text-ink mb-1 text-base font-semibold">{t('channelsTitle')}</h2>
        <Row
          label={t('whatsapp')}
          checked={!isFree && s.whatsappEnabled}
          onChange={(v) => set('whatsappEnabled', v)}
          disabled={isFree}
          hint={isFree ? t('whatsappFree') : t('whatsappHint')}
        />
      </section>

      {/* Nota personalizada */}
      <section>
        <label className="text-ink-secondary text-sm font-semibold">{t('customMessage')}</label>
        <Textarea
          value={s.customMessage}
          onChange={(e) => set('customMessage', e.target.value)}
          placeholder={t('customPlaceholder')}
          maxLength={280}
          className="mt-1.5"
        />
      </section>

      <p className="text-ink-tertiary flex items-start gap-2 text-xs">
        <Info className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('whatsappHint')}
      </p>

      <div>
        <Button onClick={save} loading={loading}>
          {loading ? tc('saving') : tc('save')}
        </Button>
      </div>
    </div>
  );
}
