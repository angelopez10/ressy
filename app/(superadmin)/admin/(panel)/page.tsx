import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpCircle,
  CalendarClock,
  CreditCard,
  Radio,
  UserPlus,
} from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { MrrChart } from '@/components/admin/MrrChart';
import { RangePicker } from '@/components/admin/RangePicker';
import { FunnelBar, Kpi, Panel, PanelTitle } from '@/components/admin/primitives';
import { requireAdmin } from '@/lib/admin/guard';
import { fmtDate, pct, timeAgo, usd } from '@/lib/admin/format';
import {
  getMrrSeries,
  getOverviewStats,
  getPlatformAlerts,
  getRecentActivity,
  isRangeKey,
  type RangeKey,
} from '@/lib/admin/queries';
import { money } from '@/lib/admin/format';

/**
 * Overview: la primera pantalla de la torre de control.
 *
 * TODO lo de acá sale de la propia DB, no de PostHog. Para dinero y estado la
 * fuente de verdad es esta DB + Mercado Pago; PostHog aparece recién en
 * Métricas, para lo que la DB no puede ver (embudos de navegación).
 *
 * El embudo de activación es exacto porque se deriva de datos duros:
 * signups = businesses · onboarding = is_published · primera reserva = ≥1 booking.
 */
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const range: RangeKey = isRangeKey(params.rango) ? params.rango : '30d';

  const [stats, alerts, activity, mrrSeries] = await Promise.all([
    getOverviewStats(actor, range),
    getPlatformAlerts(actor),
    getRecentActivity(actor, 6),
    getMrrSeries(actor, range),
  ]);

  const signupDelta =
    stats.signups.previous > 0
      ? Math.round(
          ((stats.signups.current - stats.signups.previous) / stats.signups.previous) * 100,
        )
      : null;

  const churnDelta =
    stats.churn.previous > 0
      ? Math.round(((stats.churn.current - stats.churn.previous) / stats.churn.previous) * 100)
      : null;

  const conversion = stats.trialConversion.cohort
    ? Math.round((stats.trialConversion.paid / stats.trialConversion.cohort) * 100)
    : 0;

  // Webhook sano = procesamos algo en la última hora. Es una señal, no un SLA:
  // si nadie pagó en una hora, tampoco hubo webhooks.
  const webhookStale =
    !alerts.lastWebhookAt || Date.now() - new Date(alerts.lastWebhookAt).getTime() > 3_600_000;

  const opsAlerts = [
    alerts.failedPayments > 0 && {
      color: 'var(--color-warning)',
      title: `${alerts.failedPayments} ${alerts.failedPayments === 1 ? 'cobro fallido' : 'cobros fallidos'}`,
      sub: 'Suscripciones en past_due / unpaid',
      href: '/admin/negocios?estado=gracia',
      cta: 'Revisar',
    },
    webhookStale && {
      color: 'var(--color-warning)',
      title: 'Sin webhooks recientes',
      sub: alerts.lastWebhookAt
        ? `El último se procesó ${timeAgo(alerts.lastWebhookAt)}`
        : 'Todavía no se procesó ningún webhook de pago',
      href: null,
      cta: null,
    },
    alerts.failedNotifications > 0 && {
      color: '#B45309',
      title: `${alerts.failedNotifications} recordatorios no salieron`,
      sub: 'Envíos fallidos en las últimas 24 h',
      href: null,
      cta: null,
    },
    alerts.trialsEnding > 0 && {
      color: '#B45309',
      title: `${alerts.trialsEnding} en trial por vencer`,
      sub: 'Vencen en menos de 48 h',
      href: '/admin/negocios?trial=1',
      cta: 'Ver',
    },
    alerts.stalePendingPayments > 0 && {
      color: '#B45309',
      title: `${alerts.stalePendingPayments} reservas colgadas`,
      sub: 'En pending_payment con el TTL vencido: el job no las liberó',
      href: null,
      cta: null,
    },
  ].filter(Boolean) as {
    color: string;
    title: string;
    sub: string;
    href: string | null;
    cta: string | null;
  }[];

  const activityIcon = {
    signup: UserPlus,
    published: ArrowUpCircle,
    subscription: CreditCard,
  } as const;

  const activityText = {
    signup: 'se registró',
    published: 'publicó su booking page',
    subscription: 'movió su suscripción',
  } as const;

  return (
    <AdminShell actor={actor} title="Overview" actions={<RangePicker current={range} />}>
      <div className="flex flex-col gap-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
          <Kpi
            label="MRR (aprox. USD)"
            value={usd(stats.mrr.totalUsd)}
            hint={`${stats.mrr.paying} pagando`}
          />
          <Kpi
            label="Negocios activos"
            value={String(stats.businesses.active)}
            hint={`${stats.businesses.total} en total`}
          />
          <Kpi
            label={`Signups (${range})`}
            value={String(stats.signups.current)}
            delta={signupDelta === null ? null : { pct: signupDelta, good: signupDelta >= 0 }}
          />
          <Kpi
            label="Conversión trial→pago"
            value={`${conversion}%`}
            hint={`${stats.trialConversion.paid} de ${stats.trialConversion.cohort}`}
          />
          <Kpi
            label="Cancelaciones"
            value={String(stats.churn.current)}
            delta={churnDelta === null ? null : { pct: churnDelta, good: churnDelta <= 0 }}
          />
        </div>

        {/* MRR + embudo */}
        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Panel>
            <PanelTitle aside="Snapshot diario">MRR en el tiempo</PanelTitle>
            <div className="px-5 pb-5">
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-ink text-[26px] font-extrabold tracking-tight">
                  {usd(stats.mrr.totalUsd)}
                </span>
                <span className="text-ink-secondary text-[13px]">
                  {money(stats.mrr.usd, 'USD')} + {money(stats.mrr.clp, 'CLP')}
                </span>
              </div>
              <MrrChart points={mrrSeries} />
              {/* Ressy no convierte monedas (CLAUDE.md §3): el total en USD es
                  una referencia interna y se dice explícitamente. */}
              <p className="text-ink-tertiary mt-3 text-[11px]">
                El total en USD es aproximado: convierte CLP a un tipo de cambio fijo y
                configurable. Las cifras por moneda son las exactas.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Embudo de activación</PanelTitle>
            <div className="flex flex-col gap-3.5 px-5 pb-5">
              <FunnelBar
                label="Signups"
                n={stats.funnel.signups}
                total={stats.funnel.signups}
                color="var(--color-accent)"
              />
              <FunnelBar
                label="Onboarding completado"
                n={stats.funnel.onboarded}
                total={stats.funnel.signups}
                color="#3B8F86"
                drop={
                  stats.funnel.signups
                    ? pct(stats.funnel.signups - stats.funnel.onboarded, stats.funnel.signups)
                    : null
                }
              />
              <FunnelBar
                label="Primera reserva"
                n={stats.funnel.firstBooking}
                total={stats.funnel.signups}
                color="#5BA69E"
                drop={
                  stats.funnel.onboarded
                    ? pct(
                        stats.funnel.onboarded - stats.funnel.firstBooking,
                        stats.funnel.onboarded,
                      )
                    : null
                }
              />
              <p className="text-ink-tertiary mt-1 text-[11px]">
                Medido sobre negocios creados en el período. Sale de la DB, no de PostHog.
              </p>
            </div>
          </Panel>
        </div>

        {/* Actividad + alertas */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelTitle>Actividad reciente</PanelTitle>
            <div className="px-5 pb-3">
              {activity.length === 0 ? (
                <p className="text-ink-tertiary py-6 text-center text-[13px]">
                  Todavía no hay movimiento.
                </p>
              ) : (
                activity.map((a, i) => {
                  const Icon = activityIcon[a.kind];
                  return (
                    <Link
                      key={`${a.kind}-${a.businessId}-${i}`}
                      href={`/admin/negocios/${a.businessId}`}
                      className="border-border hover:bg-surface-alt -mx-2 flex items-center gap-3 border-t px-2 py-2.5 first:border-t-0"
                    >
                      <span className="bg-accent-soft text-accent flex size-[30px] shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-[15px]" aria-hidden="true" />
                      </span>
                      <span className="text-ink min-w-0 flex-1 truncate text-[13.5px]">
                        <strong className="font-semibold">{a.businessName}</strong>{' '}
                        {activityText[a.kind]}
                      </span>
                      <span className="text-ink-tertiary text-[12px] whitespace-nowrap">
                        {timeAgo(a.at)}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              aside={
                opsAlerts.length > 0 ? (
                  <span className="bg-warning rounded-full px-2 py-0.5 text-[11px] font-bold text-white">
                    {opsAlerts.length}
                  </span>
                ) : null
              }
            >
              Alertas operativas
            </PanelTitle>
            <div className="px-5 pb-4">
              {opsAlerts.length === 0 ? (
                <p className="text-ink-secondary flex items-center gap-2 py-6 text-center text-[13px]">
                  <Radio className="text-success size-4" aria-hidden="true" />
                  Todo tranquilo: sin cobros fallidos, webhooks al día.
                </p>
              ) : (
                opsAlerts.map((al, i) => (
                  <div
                    key={i}
                    className="border-border flex items-start gap-3 border-t py-3 first:border-t-0"
                  >
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: al.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink text-[13.5px] font-semibold">{al.title}</p>
                      <p className="text-ink-secondary text-[12.5px]">{al.sub}</p>
                    </div>
                    {al.href && al.cta ? (
                      <Link
                        href={al.href}
                        className="text-accent text-[12px] font-semibold whitespace-nowrap"
                      >
                        {al.cta} →
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <p className="text-ink-tertiary flex items-center gap-2 text-[12px]">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          Período: {fmtDate(new Date(Date.now() - 1).toISOString())} · los importes de dinero salen
          de esta DB y de Mercado Pago, nunca de analytics.
        </p>

        {stats.businesses.suspended > 0 ? (
          <p className="text-warning flex items-center gap-2 text-[12px] font-semibold">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {stats.businesses.suspended}{' '}
            {stats.businesses.suspended === 1 ? 'cuenta suspendida' : 'cuentas suspendidas'} —
            excluidas del MRR.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}
