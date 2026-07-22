'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { Tabs } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { WeeklyHoursEditor, type DayHours } from '@/components/dashboard/WeeklyHoursEditor';
import { saveBusinessHours } from '@/lib/dashboard/hours.actions';
import type { PoliciesData } from '@/lib/dashboard/settings';
import type { Enums } from '@/lib/db/types';
import type { NotifSettingsDTO } from '@/lib/dashboard/notifications';
import { BusinessTab } from './BusinessTab';
import { PoliciesTab } from './PoliciesTab';
import { PageTab } from './PageTab';
import { PlanTab, type UsageDTO as PlanUsageDTO, type PlanBillingDTO } from './PlanTab';
import { PaymentsTab } from './PaymentsTab';
import { NotificationsTab } from './NotificationsTab';
import type { MpConnectionInfo } from '@/lib/payments/mercadopago/account';
import type { DepositRow } from '@/lib/dashboard/payments';

export interface SettingsBusiness {
  id: string;
  name: string;
  category: string | null;
  timezone: string;
  currency: string;
  bookingLocale: 'es' | 'en';
  accentColor: string | null;
  logoUrl: string | null;
  address: string | null;
  slug: string;
  isPublished: boolean;
}

export function SettingsView({
  business,
  tier,
  policies,
  hours,
  notifSettings,
  planUsage,
  trial,
  planBilling,
  payments,
  locale,
  initialTab,
}: {
  business: SettingsBusiness;
  tier: Enums<'subscription_tier'>;
  policies: PoliciesData;
  hours: DayHours[];
  notifSettings: NotifSettingsDTO;
  planUsage: { bookings: PlanUsageDTO; staff: PlanUsageDTO; whatsapp: PlanUsageDTO };
  trial: { isTrial: boolean; daysLeft: number };
  planBilling: PlanBillingDTO;
  payments: {
    connection: MpConnectionInfo;
    deposits: DepositRow[];
    canUseDeposits: boolean;
    hasDepositsConfigured: boolean;
  };
  locale: string;
  initialTab: string;
}) {
  const t = useTranslations('dashboard.settings');
  const { toast } = useToast();
  const [tab, setTab] = useState(initialTab);

  const tabs = (['business', 'hours', 'policies', 'page', 'notifications', 'plan', 'payments'] as const).map((id) => ({
    id,
    label: t(`tabs.${id}`),
  }));

  async function onSaveHours(days: DayHours[]): Promise<boolean> {
    const res = await saveBusinessHours(days);
    if (res.ok) toast(t('toast.saved'));
    else toast(t('errors.generic'), 'error');
    return res.ok;
  }

  return (
    <div>
      <PageHeader title={t('title')} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />

      <div className="max-w-2xl">
        {tab === 'business' && <BusinessTab business={business} />}
        {tab === 'hours' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-ink text-base font-semibold">{t('hours.title')}</h2>
              <p className="text-ink-secondary text-sm">{t('hours.subtitle')}</p>
            </div>
            <WeeklyHoursEditor initial={hours} onSave={onSaveHours} />
          </div>
        )}
        {tab === 'policies' && <PoliciesTab policies={policies} currency={business.currency} />}
        {tab === 'page' && <PageTab business={business} locale={locale} />}
        {tab === 'notifications' && <NotificationsTab settings={notifSettings} tier={tier} />}
        {tab === 'plan' && (
          <PlanTab
            tier={tier}
            trial={trial}
            bookings={planUsage.bookings}
            staff={planUsage.staff}
            whatsapp={planUsage.whatsapp}
            billing={planBilling}
          />
        )}
        {tab === 'payments' && (
          <PaymentsTab
            connection={payments.connection}
            deposits={payments.deposits}
            canUseDeposits={payments.canUseDeposits}
            hasDepositsConfigured={payments.hasDepositsConfigured}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
