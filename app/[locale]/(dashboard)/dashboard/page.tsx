import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DashboardHome />;
}

function DashboardHome() {
  const t = useTranslations('dashboard');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 text-ink">{t('welcome')}</h1>
        <p className="text-body text-ink-secondary max-w-2xl">{t('subtitle')}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarDays className="text-ink-tertiary size-8" aria-hidden="true" />
          <h2 className="text-h3 text-ink">{t('placeholderCard.title')}</h2>
          <p className="text-body text-ink-secondary max-w-sm">{t('placeholderCard.body')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
