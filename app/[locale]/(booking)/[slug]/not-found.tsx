import { getTranslations } from 'next-intl/server';
import { CalendarX } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';

/**
 * 404 de la booking page: slug inexistente o negocio no publicado. Vive dentro
 * del chrome de `(booking)`, así que hereda el frame y el footer.
 */
export default async function BookingNotFound() {
  const t = await getTranslations('booking.notFound');

  return (
    <div className="flex flex-col items-center gap-5 px-6 py-20 text-center">
      <span className="bg-surface-alt text-ink-tertiary flex size-16 items-center justify-center rounded-full">
        <CalendarX className="size-7" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 text-ink">{t('title')}</h1>
        <p className="text-body text-ink-secondary max-w-xs">{t('body')}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/">{t('cta')}</Link>
      </Button>
    </div>
  );
}
