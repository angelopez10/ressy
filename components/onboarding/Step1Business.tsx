'use client';

import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import {
  CATEGORIES,
  COUNTRIES,
  CURRENCIES,
  TIMEZONES,
  countryByCode,
  type CategoryKey,
} from '@/lib/onboarding/countries';
import { Input } from '@/components/ui/Input';
import { Field, Select } from './fields';

export interface BasicsState {
  name: string;
  ownerName: string;
  category: CategoryKey;
  country: string;
  timezone: string;
  currency: string;
}

/** Etiqueta de zona: "Santiago · GMT-3" (offset del momento, respeta DST). */
function tzLabel(tz: string): string {
  const city = tz.split('/').pop()?.replaceAll('_', ' ') ?? tz;
  const gmt = DateTime.now().setZone(tz).toFormat('ZZZZ');
  return `${city} · ${gmt}`;
}

/** Etiqueta de moneda: "CLP · $" (símbolo vía Intl). */
function currencyLabel(code: string, locale: string): string {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).formatToParts(
    0,
  );
  const symbol = parts.find((p) => p.type === 'currency')?.value ?? code;
  return symbol === code ? code : `${code} · ${symbol}`;
}

export function Step1Business({
  value,
  onChange,
  locale,
  error,
}: {
  value: BasicsState;
  onChange: (v: BasicsState) => void;
  locale: 'es' | 'en';
  error: string | null;
}) {
  const t = useTranslations('onboarding.step1');
  const tc = useTranslations('onboarding.categories');
  const set = (patch: Partial<BasicsState>) => onChange({ ...value, ...patch });

  // Al cambiar de país, deriva tz + moneda por defecto (ambos siguen ajustables).
  function onCountry(code: string) {
    const c = countryByCode(code);
    set({
      country: code,
      timezone: c?.timezone ?? value.timezone,
      currency: c?.currency ?? value.currency,
    });
  }

  return (
    <div>
      <h1 className="text-ink text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1 mb-6">{t('subtitle')}</p>

      <div className="flex flex-col gap-4">
        <Field
          label={t('name')}
          error={error === 'nameRequired' ? t('errors.nameRequired') : undefined}
        >
          <Input
            value={value.name}
            placeholder={t('namePlaceholder')}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <Field
          label={t('ownerName')}
          hint={t('ownerHint')}
          error={error === 'ownerRequired' ? t('errors.ownerRequired') : undefined}
        >
          <Input
            value={value.ownerName}
            placeholder={t('ownerPlaceholder')}
            onChange={(e) => set({ ownerName: e.target.value })}
          />
        </Field>

        <Field label={t('category')}>
          <Select
            value={value.category}
            onChange={(e) => set({ category: e.target.value as CategoryKey })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tc(c)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t('country')}>
          <Select value={value.country} onChange={(e) => onCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {locale === 'en' ? c.nameEn : c.nameEs}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('timezone')}>
            <Select value={value.timezone} onChange={(e) => set({ timezone: e.target.value })}>
              {[...new Set([value.timezone, ...TIMEZONES])].map((tz) => (
                <option key={tz} value={tz}>
                  {tzLabel(tz)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('currency')}>
            <Select value={value.currency} onChange={(e) => set({ currency: e.target.value })}>
              {[...new Set([value.currency, ...CURRENCIES])].map((c) => (
                <option key={c} value={c}>
                  {currencyLabel(c, locale)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}
