import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getHomeData } from '@/lib/dashboard/home';
import { HomeView } from '@/components/dashboard/home/HomeView';
import { CalendarEmptyState } from '@/components/dashboard/calendar/CalendarEmptyState';

type Props = { params: Promise<{ locale: string }> };

/** Home / Resumen — la primera pantalla tras el login. */
export default async function DashboardHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const data = await getHomeData(ctx);

  if (data.isEmpty) {
    return (
      <div className="border-border bg-surface rounded-card flex-1 border">
        <CalendarEmptyState slug={ctx.business.slug} locale={locale} />
      </div>
    );
  }

  return (
    <HomeView
      data={data}
      businessName={ctx.business.name}
      timezone={ctx.business.timezone}
      currency={ctx.business.currency}
      locale={locale}
    />
  );
}
