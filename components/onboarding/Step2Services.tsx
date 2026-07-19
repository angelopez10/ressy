'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ServiceDraft } from '@/lib/onboarding/schema';
import { fromMinorUnits, toMinorUnits } from '@/lib/onboarding/money';
import { Input } from '@/components/ui/Input';
import { Field } from './fields';

/**
 * Paso 2: repeater de servicios. El precio se escribe en unidad MAYOR (lo que el
 * cliente ve) y se guarda en el draft en unidad menor (integer), convertido con
 * los decimales de la moneda del negocio.
 */
export function Step2Services({
  value,
  onChange,
  currency,
  error,
}: {
  value: ServiceDraft[];
  onChange: (v: ServiceDraft[]) => void;
  currency: string;
  error: string | null;
}) {
  const t = useTranslations('onboarding.step2');

  const update = (i: number, patch: Partial<ServiceDraft>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const add = () =>
    onChange([...value, { name: '', durationMin: 30, priceAmount: 0, bufferAfterMin: 0 }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <h1 className="text-ink text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1 mb-6">{t('subtitle')}</p>

      <div className="flex flex-col gap-5">
        {value.map((s, i) => (
          <div key={i} className="border-border rounded-card border p-4">
            <div className="flex flex-col gap-3">
              <Field label={t('name')}>
                <Input
                  value={s.name}
                  placeholder={t('namePlaceholder')}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </Field>

              <div className="flex items-end gap-3">
                <Field label={t('duration')}>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={5}
                      step={5}
                      value={s.durationMin}
                      onChange={(e) => update(i, { durationMin: Number(e.target.value) })}
                      className="pr-12"
                    />
                    <span className="text-ink-tertiary text-small pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                      min
                    </span>
                  </div>
                </Field>

                <Field label={t('price')}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={fromMinorUnits(s.priceAmount, currency)}
                    onChange={(e) =>
                      update(i, { priceAmount: toMinorUnits(e.target.value, currency) })
                    }
                    aria-label={`${t('price')} (${currency})`}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={value.length === 1}
                  aria-label={t('remove')}
                  className="bg-surface-alt text-ink-secondary hover:text-warning rounded-input flex h-12 w-11 shrink-0 items-center justify-center transition-colors disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="text-accent hover:text-accent-hover text-small mt-4 flex items-center gap-1.5 font-semibold"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t('add')}
      </button>

      {error && (
        <p role="alert" className="text-warning text-small mt-4">
          {error === 'atLeastOneService' || error === 'serviceNameRequired'
            ? t(`errors.${error}`)
            : t('errors.generic')}
        </p>
      )}
    </div>
  );
}
