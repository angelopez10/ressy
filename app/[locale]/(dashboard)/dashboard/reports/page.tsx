import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getReports, rangeToUtc, type ReportRange } from '@/lib/dashboard/reports';
import { ReportsView } from '@/components/dashboard/reports/ReportsView';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
};

const RANGES: ReportRange[] = ['last7', 'last30', 'thisMonth', 'thisYear'];

export default async function ReportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { range: rangeParam } = await searchParams;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const range: ReportRange = RANGES.includes(rangeParam as ReportRange) ? (rangeParam as ReportRange) : 'last30';
  const { fromIso, toIso } = rangeToUtc(range, ctx.business.timezone);
  const data = await getReports(ctx.business.id, ctx.business.timezone, fromIso, toIso);

  return (
    <ReportsView
      data={data}
      range={range}
      currency={ctx.business.currency}
      locale={locale}
      canExport={ctx.tier === 'business'}
    />
  );
}
