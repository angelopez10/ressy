'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { saveBusinessInfo } from '@/lib/dashboard/settings.actions';
import type { SettingsBusiness } from './SettingsView';

const CATEGORY_KEYS = ['barbershop', 'hair_salon', 'spa', 'clinic', 'fitness', 'tattoo', 'legal', 'other'];
const TZ = [
  'America/Santiago',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Argentina/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
];

const field = 'flex flex-col gap-1.5';
const label = 'text-ink-secondary text-sm font-semibold';

export function BusinessTab({ business }: { business: SettingsBusiness }) {
  const t = useTranslations('dashboard.settings');
  const tCat = useTranslations('onboarding.categories');
  const tc = useTranslations('dashboard.actions');
  const { toast } = useToast();

  const [name, setName] = useState(business.name);
  const [category, setCategory] = useState(business.category ?? '');
  const [address, setAddress] = useState(business.address ?? '');
  const [timezone, setTimezone] = useState(business.timezone);
  const [loading, setLoading] = useState(false);

  const tzOptions = TZ.includes(timezone) ? TZ : [timezone, ...TZ];

  async function save() {
    setLoading(true);
    const res = await saveBusinessInfo({ name, category, address, timezone });
    setLoading(false);
    if (res.ok) toast(t('toast.saved'));
    else toast(t(res.error === 'nameRequired' ? 'errors.nameRequired' : 'errors.generic'), 'error');
  }

  return (
    <div className="flex flex-col gap-4">
      <label className={field}>
        <span className={label}>{t('business.name')}</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className={field}>
        <span className={label}>{t('business.category')}</span>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {tCat(k)}
            </option>
          ))}
        </Select>
      </label>

      <label className={field}>
        <span className={label}>{t('business.address')}</span>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className={field}>
        <span className={label}>{t('business.timezone')}</span>
        <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {tzOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
        <span className="text-warning inline-flex items-center gap-1.5 text-xs">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {t('business.tzWarning')}
        </span>
      </label>

      <label className={field}>
        <span className={label}>{t('business.currency')}</span>
        <Input value={business.currency} disabled />
        <span className="text-ink-tertiary text-xs">{t('business.currencyLocked')}</span>
      </label>

      <div>
        <Button onClick={save} loading={loading} disabled={!name.trim()}>
          {loading ? tc('saving') : tc('save')}
        </Button>
      </div>
    </div>
  );
}
