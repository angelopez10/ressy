import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getServices, getActiveStaff } from '@/lib/dashboard/services';
import { ServicesView } from '@/components/dashboard/services/ServicesView';

type Props = { params: Promise<{ locale: string }> };

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const [services, staff] = await Promise.all([
    getServices(ctx.business.id),
    getActiveStaff(ctx.business.id),
  ]);

  return (
    <ServicesView
      services={services}
      staff={staff}
      currency={ctx.business.currency}
      locale={locale}
    />
  );
}
