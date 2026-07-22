import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getSubscriptionBilling } from '@/lib/payments';
import { UpgradeView } from '@/components/dashboard/upgrade/UpgradeView';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ billing?: string }>;
};

/**
 * Pantalla "Mejora tu plan" (mockup del dashboard). El cambio real lo maneja
 * <UpgradeView> vía las server actions; acá solo se resuelve el contexto y si el
 * billing por MP está disponible (moneda CLP + provider configurado).
 */
export default async function UpgradePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { billing } = await searchParams;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const billingEnabled =
    ctx.business.currency.toUpperCase() === 'CLP' && getSubscriptionBilling().isConfigured();

  return (
    <UpgradeView
      currentTier={ctx.tier}
      billingEnabled={billingEnabled}
      locale={locale}
      justReturned={billing === 'return'}
    />
  );
}
