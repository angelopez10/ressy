import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getSettingsData } from '@/lib/dashboard/settings';
import { getNotifSettings } from '@/lib/dashboard/notifications';
import { SettingsView } from '@/components/dashboard/settings/SettingsView';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TABS = ['business', 'hours', 'policies', 'page', 'notifications', 'plan', 'payments'];

export default async function SettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const [data, notifSettings] = await Promise.all([
    getSettingsData(ctx.business.id),
    getNotifSettings(ctx.business.id),
  ]);

  return (
    <SettingsView
      business={{
        id: ctx.business.id,
        name: ctx.business.name,
        category: ctx.business.category,
        timezone: ctx.business.timezone,
        currency: ctx.business.currency,
        bookingLocale: ctx.business.bookingLocale,
        accentColor: ctx.business.accentColor,
        logoUrl: ctx.business.logoUrl,
        address: ctx.business.address,
        slug: ctx.business.slug,
        isPublished: ctx.business.isPublished,
      }}
      tier={ctx.tier}
      policies={data.policies}
      hours={data.hours}
      notifSettings={notifSettings}
      staffCount={data.staffCount}
      locale={locale}
      initialTab={tab && TABS.includes(tab) ? tab : 'business'}
    />
  );
}
