import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getClients } from '@/lib/dashboard/clients';
import { ClientsView } from '@/components/dashboard/clients/ClientsView';

type Props = { params: Promise<{ locale: string }> };

export default async function ClientsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  const clients = await getClients(ctx.business.id);
  return <ClientsView clients={clients} currency={ctx.business.currency} locale={locale} />;
}
