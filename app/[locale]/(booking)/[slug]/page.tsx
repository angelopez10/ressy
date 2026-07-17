import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * Placeholder de la booking page pública (`getressy.com/{slug}`).
 * La pantalla real —selección de servicio, slots, guest checkout— llega en la
 * sesión 2 junto al motor de disponibilidad.
 */
export default async function BookingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('booking');

  return (
    <main className="bg-surface-alt min-h-screen py-16">
      <div className="container-page max-w-2xl">
        <div className="mb-8 flex justify-end">
          <LocaleSwitcher />
        </div>

        <Card>
          <CardHeader>
            <Badge tone="neutral" className="self-start">
              {t('slugLabel')}
            </Badge>
            <CardTitle className="font-mono">{slug}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <h1 className="text-h2 text-ink">{t('placeholderTitle')}</h1>
            <p className="text-body text-ink-secondary">{t('placeholderSubtitle')}</p>
            <p className="text-small text-ink-tertiary">{t('notReady')}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
