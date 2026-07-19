import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { CalendarView } from '@/components/dashboard/calendar/CalendarView';
import { getAgenda } from '@/lib/dashboard/queries';
import type { CalendarView as CalendarViewType } from '@/lib/dashboard/types';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string; date?: string }>;
};

/**
 * Agenda del negocio — la pantalla operativa diaria. Dinámica: depende de la
 * sesión (RLS), de searchParams (rango visible) y del reloj (línea de "ahora").
 *
 * Vista por defecto: semana en desktop, día en móvil (se deduce del user-agent
 * solo para el PRIMER render; después el toggle manda vía ?view=).
 */
export default async function DashboardAgendaPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { view, date } = await searchParams;

  const resolvedView: CalendarViewType =
    view === 'day' || view === 'week' ? view : (await defaultView());

  const bundle = await getAgenda(resolvedView, date);
  // El layout ya redirige sin negocio; esto es defensa en profundidad.
  if (!bundle) redirect(`/${locale}/onboarding`);

  return (
    <CalendarView bundle={bundle} locale={locale} nowIso={new Date().toISOString()} />
  );
}

/** Semana en desktop, día en móvil, según el user-agent del primer request. */
async function defaultView(): Promise<CalendarViewType> {
  const ua = (await headers()).get('user-agent') ?? '';
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'day' : 'week';
}
