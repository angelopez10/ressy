'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Check, Clock, Scissors, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { formatLongDate, formatSlotTime, timezoneLabel } from '@/lib/booking/format';
import { icsDataUri } from '@/lib/booking/ics';
import type {
  BookingBusinessDTO,
  BookingServiceDTO,
  BookingStaffDTO,
  SlotDTO,
} from '@/lib/booking/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  business: BookingBusinessDTO;
  service: BookingServiceDTO;
  slot: SlotDTO;
  staff: BookingStaffDTO | null;
  locale: 'es' | 'en';
  token: string;
  status: string;
}

/**
 * Paso 5: confirmación. Check sutil (fade+scale al montar, nada estridente),
 * resumen en card, descarga `.ics` y link a la gestión sin login (por token).
 */
export function ConfirmationStep({ business, service, slot, staff, locale, token, status }: Props) {
  const t = useTranslations('booking.confirm');
  const tStaff = useTranslations('booking.staff');
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);

  const start = new Date(slot.startsAtIso);
  const end = new Date(slot.endsAtIso);
  const tz = business.timezone;
  const pending = status === 'pending_payment';
  const proName = staff?.name ?? tStaff('any');

  const ics = icsDataUri({
    uid: token,
    start,
    end,
    title: `${service.name} · ${business.name}`,
    description: pending ? undefined : `${service.name} — ${proName}`,
    location: business.name,
  });

  return (
    <div className="flex flex-1 flex-col px-5 pt-5 pb-10 text-center">
      <div
        className={cn(
          'bg-success-soft mx-auto mb-5 flex size-20 items-center justify-center rounded-full transition-all duration-500',
          shown ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      >
        <Check className="text-success size-10" strokeWidth={3} aria-hidden="true" />
      </div>

      <h1 className="text-ink text-2xl font-bold tracking-tight">
        {pending ? t('pendingTitle') : t('title')}
      </h1>
      <p className="text-ink-secondary text-small mx-auto mt-1.5 mb-6 max-w-xs">
        {pending ? t('pendingBody') : t('body')}
      </p>

      <div className="border-border rounded-card shadow-card border p-4 text-left">
        <div className="border-border flex items-center gap-3 border-b pb-3.5">
          <span className="bg-ink flex size-11 items-center justify-center rounded-xl font-extrabold text-white">
            {business.name.charAt(0)}
          </span>
          <div>
            <p className="text-ink font-bold">{business.name}</p>
            {business.category && (
              <p className="text-ink-secondary text-small">{business.category}</p>
            )}
          </div>
        </div>

        <SummaryRow icon={<Scissors className="size-4" />} label={t('service')}>
          {service.name} · {service.durationMin} min
        </SummaryRow>
        <SummaryRow icon={<User className="size-4" />} label={t('professional')}>
          {proName}
        </SummaryRow>
        <SummaryRow icon={<Clock className="size-4" />} label={t('date')}>
          {formatLongDate(start, tz, locale)}
        </SummaryRow>
        <SummaryRow icon={<Clock className="size-4" />} label={t('time')}>
          {formatSlotTime(start, tz, locale)} · {timezoneLabel(tz, start, locale)}
        </SummaryRow>
      </div>

      <div className="mt-5 flex gap-2.5">
        <Button asChild className="flex-1">
          <a href={ics} download={`${business.slug}.ics`}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            {t('addToCalendar')}
          </a>
        </Button>
        <Button asChild variant="secondary" className="flex-1">
          <Link href={`/${business.slug}/manage/${token}`}>{t('manage')}</Link>
        </Button>
      </div>
    </div>
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
    <div className="flex items-center gap-3 pt-3.5">
      <span className="text-ink-secondary flex size-8 shrink-0 items-center justify-center">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-ink-tertiary text-xs">{label}</p>
        <p className="text-ink text-small font-medium">{children}</p>
      </div>
    </div>
  );
}
