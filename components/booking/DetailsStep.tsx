'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { depositAmount, formatMoney } from '@/lib/booking/format';
import { guestDetailsSchema } from '@/lib/booking/schema';
import type {
  BookingBusinessDTO,
  BookingPoliciesDTO,
  BookingServiceDTO,
  BookingStaffDTO,
  BookingFailure,
  SlotDTO,
} from '@/lib/booking/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface Props {
  business: BookingBusinessDTO;
  policies: BookingPoliciesDTO;
  service: BookingServiceDTO;
  slot: SlotDTO;
  staff: BookingStaffDTO | null;
  locale: 'es' | 'en';
  submitting: boolean;
  error: BookingFailure | null;
  onConfirm: (guest: { fullName: string; email?: string; phone?: string; note?: string }) => void;
}

type FieldErrors = Partial<Record<'fullName' | 'email' | 'phone', string>>;

/**
 * Paso 4: datos del cliente (guest checkout) + resumen del anticipo. Valida con
 * el mismo esquema Zod del server action (CLAUDE.md §6). El cobro real es de una
 * sesión posterior: aquí solo se muestra el monto y un placeholder claro.
 */
export function DetailsStep({
  business,
  policies,
  service,
  locale,
  submitting,
  error,
  onConfirm,
}: Props) {
  const t = useTranslations('booking.details');
  const errT = useTranslations('booking.errors');
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', note: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  const deposit = depositAmount(policies, service.priceAmount);
  const hasDeposit = deposit > 0;

  function submit() {
    const parsed = guestDetailsSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        // El `message` es un código i18n (ver schema.ts); lo traducimos aquí.
        if (field === 'fullName' || field === 'email' || field === 'phone') {
          next[field] = errT(issue.message);
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onConfirm(parsed.data);
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-2 pb-8">
      <h1 className="text-ink text-h3">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1 mb-5">{t('guestHint')}</p>

      <div className="flex flex-col gap-4">
        <Field label={t('name')} error={errors.fullName}>
          <Input
            value={values.fullName}
            placeholder={t('namePlaceholder')}
            aria-invalid={Boolean(errors.fullName)}
            onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          />
        </Field>
        <Field label={t('email')} error={errors.email}>
          <Input
            type="email"
            inputMode="email"
            value={values.email}
            placeholder="tucorreo@email.com"
            aria-invalid={Boolean(errors.email)}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          />
        </Field>
        <Field label={t('phone')} error={errors.phone}>
          <Input
            type="tel"
            inputMode="tel"
            value={values.phone}
            placeholder="+56 9 …"
            aria-invalid={Boolean(errors.phone)}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          />
        </Field>
        <Field label={t('note')}>
          <textarea
            rows={2}
            value={values.note}
            placeholder={t('notePlaceholder')}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
            className="rounded-input border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 w-full resize-none border px-4 py-3 text-base outline-none focus:ring-2"
          />
        </Field>
      </div>

      {/* Resumen + anticipo */}
      <div className="bg-surface-alt border-border rounded-card mt-5 border p-4">
        <div className="text-small mb-2 flex justify-between">
          <span className="text-ink-secondary">
            {t('summaryService', { service: service.name, duration: service.durationMin })}
          </span>
          <b className="text-ink">{formatMoney(service.priceAmount, business.currency, locale)}</b>
        </div>

        {hasDeposit ? (
          <>
            <div className="text-small flex justify-between">
              <span className="text-ink-secondary">
                {policies.depositType === 'percent' && policies.depositPercent != null
                  ? t('deposit', { percent: policies.depositPercent })
                  : t('depositFixed')}
              </span>
              <b className="text-ink">{formatMoney(deposit, business.currency, locale)}</b>
            </div>
            <div className="border-border my-3 border-t border-dashed" />
            <div className="text-ink-secondary text-small flex justify-between">
              <span>{t('payToday')}</span>
              <span>{formatMoney(deposit, business.currency, locale)}</span>
            </div>
            {/* PLACEHOLDER DE PAGO — el cobro real (Stripe/Mercado Pago) es de la
                sesión de pagos. Aquí solo se informa. */}
            <p className="text-ink-tertiary mt-3 flex items-start gap-1.5 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t('paymentPlaceholder')}
            </p>
          </>
        ) : (
          <p className="text-ink-secondary text-small">{t('noDeposit')}</p>
        )}
      </div>

      {error && error !== 'slot_taken' && error !== 'slot_unavailable' && (
        <p role="alert" className="text-warning text-small mt-4">
          {error === 'contact_required' ? errT('contactRequired') : errT('generic')}
        </p>
      )}

      <div className="mt-6">
        <Button className="w-full" loading={submitting} onClick={submit}>
          {t('confirm')}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={cn(
          'text-small mb-1.5 block font-semibold',
          error ? 'text-warning' : 'text-ink-secondary',
        )}
      >
        {label}
      </span>
      {children}
      {error && <span className="text-warning mt-1 block text-xs">{error}</span>}
    </label>
  );
}
