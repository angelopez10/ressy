import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getClientDetail } from '@/lib/dashboard/clients';
import { ClientDetailView } from '@/components/dashboard/clients/ClientDetailView';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function ClientDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const client = await getClientDetail(ctx.business.id, id);
  if (!client) notFound();

  return (
    <ClientDetailView
      client={client}
      currency={ctx.business.currency}
      locale={locale}
      timezone={ctx.business.timezone}
    />
  );
}
