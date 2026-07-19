'use client';

import { CalendarDays, Clock, Info, Scissors, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { depositAmount, formatLongDate, formatMoney, formatSlotTime } from '@/lib/booking/format';
import type {
  BookingBusinessDTO,
  BookingPoliciesDTO,
  BookingServiceDTO,
  BookingStaffDTO,
  SlotDTO,
} from '@/lib/booking/types';
import { BusinessHeader } from './BusinessHeader';

/**
 * Rail lateral del desktop (mockup): DOS cards — la portada del negocio y "Tu
 * reserva", un resumen que se llena a medida que el cliente elige servicio,
 * profesional y horario, con el total y el anticipo a pagar hoy. Oculto en móvil.
 */
export function BookingAside({
  business,
  policies,
  service,
  staff,
  anyStaff,
  slot,
  locale,
}: {
  business: BookingBusinessDTO;
  policies: BookingPoliciesDTO;
  service: BookingServiceDTO | null;
  staff: BookingStaffDTO | null;
  /** true = eligió "cualquier profesional". */
  anyStaff: boolean;
  slot: SlotDTO | null;
  locale: 'es' | 'en';
}) {
  const t = useTranslations('booking');
  const start = slot ? new Date(slot.startsAtIso) : null;
  const deposit = service ? depositAmount(policies, service.priceAmount) : 0;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:gap-6">
      {/* Card 1 — perfil del negocio. */}
      <div className="border-border rounded-card bg-surface overflow-hidden border pb-5">
        <BusinessHeader business={business} />
      </div>

      {/* Card 2 — Tu reserva (aparece al elegir servicio). */}
      {service && (
        <div className="border-border rounded-card bg-surface border p-5">
          <p className="text-ink-tertiary mb-4 text-xs font-semibold tracking-wide uppercase">
            {t('summary.title')}
          </p>

          <div className="flex flex-col gap-3">
            <SummaryRow icon={<Scissors className="size-4" />} label={t('confirm.service')}>
              {service.name}
            </SummaryRow>
            {(staff || anyStaff) && (
              <SummaryRow icon={<User className="size-4" />} label={t('confirm.professional')}>
                {staff ? staff.name : t('staff.any')}
              </SummaryRow>
            )}
            {start && (
              <>
                <SummaryRow icon={<CalendarDays className="size-4" />} label={t('confirm.date')}>
                  <span className="capitalize">
                    {formatLongDate(start, business.timezone, locale)}
                  </span>
                </SummaryRow>
                <SummaryRow icon={<Clock className="size-4" />} label={t('confirm.time')}>
                  {formatSlotTime(start, business.timezone, locale)}
                </SummaryRow>
              </>
            )}
          </div>

          <div className="border-border my-4 border-t" />

          <div className="text-ink flex items-center justify-between">
            <span className="text-ink-secondary">{t('summary.total')}</span>
            <span className="font-bold">
              {formatMoney(service.priceAmount, business.currency, locale)}
            </span>
          </div>

          {deposit > 0 && (
            <>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-ink-secondary">
                  {policies.depositType === 'percent' && policies.depositPercent != null
                    ? t('summary.depositToday', { percent: policies.depositPercent })
                    : t('summary.depositFixed')}
                </span>
                <span className="text-accent font-bold">
                  {formatMoney(deposit, business.currency, locale)}
                </span>
              </div>
              <p className="text-ink-tertiary mt-3 flex items-start gap-1.5 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t('summary.restNote')}
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-small flex items-center justify-between gap-3">
      <span className="text-ink-secondary flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
        {label}
      </span>
      <span className="text-ink min-w-0 truncate text-right font-medium">{children}</span>
    </div>
  );
}
