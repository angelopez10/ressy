import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext, STAFF_LIMIT } from '@/lib/dashboard/context';
import { getTeam, getServiceOptions, getStaffSchedules } from '@/lib/dashboard/team';
import { TeamView } from '@/components/dashboard/team/TeamView';

type Props = { params: Promise<{ locale: string }> };

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const [team, services, schedules] = await Promise.all([
    getTeam(ctx.business.id),
    getServiceOptions(ctx.business.id),
    getStaffSchedules(ctx.business.id),
  ]);

  return (
    <TeamView
      team={team}
      services={services}
      schedules={schedules}
      used={team.length}
      limit={STAFF_LIMIT[ctx.tier]}
    />
  );
}
