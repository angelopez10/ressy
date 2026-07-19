import { useTranslations } from 'next-intl';
import { DateTime } from 'luxon';
import { CalendarCheck, DollarSign, PieChart, UserPlus, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatMoney } from '@/lib/db/mappers';
import type { HomeData } from '@/lib/dashboard/home';

/**
 * Vista de resumen del día. Server component: sin interactividad más allá de los
 * links al calendario. Montos con `Intl` en la moneda del negocio, fechas/horas
 * con Luxon en su tz.
 */
export function HomeView({
  data,
  businessName,
  timezone,
  currency,
  locale,
}: {
  data: HomeData;
  businessName: string;
  timezone: string;
  currency: string;
  locale: string;
}) {
  const t = useTranslations('dashboard.home');
  const today = DateTime.now().setZone(timezone).setLocale(locale).toFormat("cccc d 'de' LLLL");
  const calendarDay = DateTime.now().setZone(timezone).toISODate();

  const hasAlerts = data.pendingPayment > 0 || data.recentNoShows > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-2xl font-bold tracking-tight">
          {t('greeting', { name: businessName })}
        </h1>
        <p className="text-ink-secondary mt-1 text-sm capitalize">{t('summary', { date: today })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard Icon={CalendarCheck} label={t('stats.bookings')} value={String(data.bookingsToday)} />
        <StatCard Icon={DollarSign} label={t('stats.revenue')} value={formatMoney(data.revenueToday, currency, locale)} />
        <StatCard Icon={PieChart} label={t('stats.occupancy')} value={`${data.occupancyPct}%`} />
        <StatCard Icon={UserPlus} label={t('stats.newClients')} value={String(data.newClientsWeek)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Próximas citas */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-ink text-base font-semibold">{t('upcoming')}</h2>
            <Link
              href={`/dashboard/calendar?view=day&date=${calendarDay}`}
              className="text-accent hover:text-accent-hover text-sm font-semibold"
            >
              {t('viewCalendar')}
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="text-ink-secondary py-8 text-center text-sm">{t('noUpcoming')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.upcoming.map((b) => {
                const time = DateTime.fromISO(b.startsAtIso, { zone: 'utc' })
                  .setZone(timezone)
                  .setLocale(locale)
                  .toFormat('HH:mm');
                return (
                  <li key={b.id}>
                    <Link
                      href={`/dashboard/calendar?view=day&date=${calendarDay}`}
                      className="border-border hover:bg-surface-alt flex items-center gap-3.5 rounded-xl border px-3.5 py-3 transition-colors"
                    >
                      <span className="text-ink w-12 text-sm font-bold">{time}</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-ink block truncate text-sm font-semibold">
                          {b.customerName}
                        </span>
                        <span className="text-ink-secondary block truncate text-xs">
                          {b.serviceName}
                        </span>
                      </span>
                      {b.status === 'pending_payment' && <Badge tone="accent">$</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Alertas */}
        <Card className="p-5">
          <h2 className="text-ink mb-4 text-base font-semibold">{t('alerts')}</h2>
          {!hasAlerts ? (
            <p className="text-ink-secondary py-8 text-center text-sm">{t('allGood')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.pendingPayment > 0 && (
                <AlertRow
                  tone="accent"
                  text={t('pendingPayment', { count: data.pendingPayment })}
                  href={`/dashboard/calendar?view=day&date=${calendarDay}`}
                />
              )}
              {data.recentNoShows > 0 && (
                <AlertRow
                  tone="warning"
                  text={t('recentNoShows', { count: data.recentNoShows })}
                  href="/dashboard/clients"
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function AlertRow({
  tone,
  text,
  href,
}: {
  tone: 'accent' | 'warning';
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border-border hover:bg-surface-alt flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors"
    >
      <span
        className={
          tone === 'warning'
            ? 'bg-warning-soft text-warning flex size-8 shrink-0 items-center justify-center rounded-full'
            : 'bg-accent-soft text-accent flex size-8 shrink-0 items-center justify-center rounded-full'
        }
      >
        <AlertTriangle className="size-4" aria-hidden="true" />
      </span>
      <span className="text-ink flex-1 text-sm font-medium">{text}</span>
      <ArrowRight className="text-ink-tertiary size-4" aria-hidden="true" />
    </Link>
  );
}
