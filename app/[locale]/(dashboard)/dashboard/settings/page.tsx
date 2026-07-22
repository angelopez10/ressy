import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getSettingsData } from '@/lib/dashboard/settings';
import { getNotifSettings } from '@/lib/dashboard/notifications';
import { SettingsView } from '@/components/dashboard/settings/SettingsView';
import { createClient } from '@/lib/db/server';
import { getPlanUsage, type UsageMetric } from '@/lib/plans/status';
import { getMpConnection } from '@/lib/dashboard/payments.actions';
import { getDeposits } from '@/lib/dashboard/payments';
import { canUseFeature } from '@/lib/plans/config';
import { getSubscriptionBilling } from '@/lib/payments';

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

  const db = await createClient();
  const [data, notifSettings, usage, connection, deposits, sub] = await Promise.all([
    getSettingsData(ctx.business.id),
    getNotifSettings(ctx.business.id),
    getPlanUsage(db, ctx.business.id, ctx.tier),
    getMpConnection(),
    getDeposits(ctx.business.id),
    db
      .from('subscriptions')
      .select('cancel_at_period_end, current_period_end')
      .eq('business_id', ctx.business.id)
      .maybeSingle(),
  ]);

  // Billing por MP: contratar/cambiar online exige moneda CLP + provider configurado.
  const planBilling = {
    enabled: ctx.business.currency.toUpperCase() === 'CLP' && getSubscriptionBilling().isConfigured(),
    cancelAtPeriodEnd: sub.data?.cancel_at_period_end ?? false,
    currentPeriodEnd: sub.data?.current_period_end ?? null,
  };

  // A DTO serializable (Infinity → { unlimited: true, limit: null }).
  const toDTO = (m: UsageMetric) => ({
    used: m.used,
    limit: Number.isFinite(m.limit) ? m.limit : null,
    unlimited: !Number.isFinite(m.limit),
  });

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
      planUsage={{
        bookings: toDTO(usage.bookings),
        staff: toDTO(usage.staff),
        whatsapp: toDTO(usage.whatsapp),
      }}
      trial={{ isTrial: ctx.trial.isTrial, daysLeft: ctx.trial.daysLeft }}
      planBilling={planBilling}
      payments={{
        connection,
        deposits,
        canUseDeposits: canUseFeature(ctx.tier, 'deposits'),
        hasDepositsConfigured: data.policies.depositType !== 'none',
      }}
      locale={locale}
      initialTab={tab && TABS.includes(tab) ? tab : 'business'}
    />
  );
}
