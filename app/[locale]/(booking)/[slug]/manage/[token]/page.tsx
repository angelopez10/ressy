import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ManageBooking } from '@/components/booking/ManageBooking';
import { fetchBooking } from '@/lib/booking/actions';
import type { Locale } from '@/lib/i18n/routing';

type Props = { params: Promise<{ locale: Locale; slug: string; token: string }> };

/**
 * Gestión de una reserva sin login. El token de la URL es el secreto; se resuelve
 * server-side vía `get_public_booking` (RPC SECURITY DEFINER). Un token inválido
 * no revela nada: cae al mensaje "no encontrado".
 */
export default async function ManagePage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('booking.manage');

  const view = await fetchBooking(token);

  if (!view) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="text-ink text-h3">{t('title')}</h1>
        <p className="text-ink-secondary text-small mt-2">{t('notFound')}</p>
      </div>
    );
  }

  return <ManageBooking view={view} token={token} locale={locale} />;
}
