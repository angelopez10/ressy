import { useTranslations } from 'next-intl';
import { CalendarOff } from 'lucide-react';
import { BusinessHeader } from './BusinessHeader';
import { Card } from '@/components/ui/Card';
import type { BookingBusinessDTO } from '@/lib/booking/types';

/**
 * Estado neutro y digno cuando el negocio no acepta reservas online (topó el
 * plan Free). REGLA NO NEGOCIABLE (CLAUDE.md §Prompt 09): jamás un error técnico
 * ni "el negocio no pagó". El cliente ve la portada del negocio y un mensaje
 * amable — nunca sabe que es un tema de plan.
 */
export function BookingUnavailable({ business }: { business: BookingBusinessDTO }) {
  const t = useTranslations('booking.unavailable');

  return (
    <div className="mx-auto w-full max-w-xl py-6">
      <Card className="overflow-hidden pb-8">
        <BusinessHeader business={business} />
        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
          <div className="bg-surface-alt text-ink-secondary flex size-14 items-center justify-center rounded-full">
            <CalendarOff className="size-6" aria-hidden="true" />
          </div>
          <h2 className="text-ink text-xl font-bold">{t('title')}</h2>
          <p className="text-ink-secondary max-w-sm text-sm leading-relaxed">{t('body')}</p>
        </div>
      </Card>
    </div>
  );
}
