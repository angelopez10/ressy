import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { BusinessHeader } from './BusinessHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link } from '@/lib/i18n/navigation';
import type { BookingBusinessDTO } from '@/lib/booking/types';

export type PaymentReturnStatus = 'success' | 'pending' | 'failure';

/**
 * Pantalla de vuelta desde el checkout de Mercado Pago. Importante: el estado
 * final SIEMPRE lo decide el webhook, no este redirect. Por eso "success" dice
 * "confirmando" (no "confirmado"). Deja claro que Ressy no es parte de la
 * transacción: el cobro y su política son del negocio.
 */
export function PaymentReturn({
  business,
  status,
}: {
  business: BookingBusinessDTO;
  status: PaymentReturnStatus;
}) {
  const t = useTranslations('booking.paymentReturn');

  const icon =
    status === 'success' ? (
      <CheckCircle2 className="text-success size-7" aria-hidden="true" />
    ) : status === 'pending' ? (
      <Clock className="text-accent size-7" aria-hidden="true" />
    ) : (
      <XCircle className="text-warning size-7" aria-hidden="true" />
    );

  return (
    <div className="mx-auto w-full max-w-xl py-6">
      <Card className="overflow-hidden pb-8">
        <BusinessHeader business={business} />
        <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
          <div className="bg-surface-alt flex size-14 items-center justify-center rounded-full">{icon}</div>
          <h2 className="text-ink text-xl font-bold">{t(`${status}.title`)}</h2>
          <p className="text-ink-secondary max-w-sm text-sm leading-relaxed">{t(`${status}.body`)}</p>

          {status === 'failure' ? (
            <Button asChild className="mt-2">
              <Link href={`/${business.slug}`}>{t('retry')}</Link>
            </Button>
          ) : null}

          <p className="text-ink-tertiary mt-2 max-w-sm text-xs leading-relaxed">{t('disclaimer')}</p>
        </div>
      </Card>
    </div>
  );
}
