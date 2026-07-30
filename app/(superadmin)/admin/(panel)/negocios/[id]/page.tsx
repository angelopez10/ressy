import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { SupportActions } from '@/components/admin/SupportActions';
import { Dot, Panel, PanelTitle, Pill } from '@/components/admin/primitives';
import { requireAdmin } from '@/lib/admin/guard';
import {
  ACTION_LABEL,
  HEALTH_COLOR,
  PLAN_COLOR,
  PLAN_LABEL,
  STATE_COLOR,
  STATE_LABEL,
  fmtDate,
  fmtDateTime,
  money,
  moneyMinor,
  timeAgo,
} from '@/lib/admin/format';
import { mrrFor } from '@/lib/admin/pricing';
import { getAuditLog, getBusinessDetail, type BusinessState } from '@/lib/admin/queries';

/**
 * Ficha del negocio: la pantalla de soporte.
 *
 * Puede mostrar datos del negocio en contexto de atención, pero NO exporta nada
 * ni manda nada a analytics (CLAUDE.md §9). Por eso no hay historial de
 * clientes finales acá: para eso está la impersonación, que queda auditada.
 *
 * Las acciones sensibles van visualmente separadas en su propia "zona", como en
 * el mockup, y cada una pide confirmación.
 */
export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;

  const detail = await getBusinessDetail(actor, id);
  if (!detail) notFound();

  const { business, subscription, counts, weekly, payments, milestones } = detail;
  const audit = await getAuditLog(actor, { businessId: id, perPage: 12 });

  const tier = subscription?.tier ?? 'free';
  const state: BusinessState = business.suspendedAt
    ? 'suspendido'
    : !subscription
      ? 'free'
      : ['canceled', 'incomplete_expired', 'unpaid'].includes(subscription.status)
        ? 'cancelado'
        : ['past_due', 'incomplete'].includes(subscription.status)
          ? 'gracia'
          : subscription.isTrial
            ? 'trial'
            : tier === 'free'
              ? 'free'
              : 'activo';

  const noShowRate = counts.bookings > 0 ? (counts.noShow / counts.bookings) * 100 : 0;

  // Mismo cálculo que usa la tabla y el Overview, leyendo `lib/plans/config.ts`.
  const mrr = mrrFor(
    tier,
    business.currency,
    subscription?.status ?? 'active',
    subscription?.isTrial ?? false,
  );

  const health =
    business.suspendedAt || Date.now() - new Date(milestones.lastBookingAt ?? 0).getTime() > 30 * 86_400_000
      ? 'inactivo'
      : state === 'gracia'
        ? 'riesgo'
        : 'sano';

  const maxWeek = Math.max(1, ...weekly.map((w) => w.count));

  const timeline = [
    milestones.createdAt && { title: 'Se registró', date: milestones.createdAt, dot: '#B0B0B0' },
    business.isPublished && {
      title: 'Publicó su booking page',
      date: null,
      dot: '#008A05',
    },
    milestones.firstBookingAt && {
      title: 'Primera reserva recibida',
      date: milestones.firstBookingAt,
      dot: '#3B6FB0',
    },
    milestones.mpConnectedAt && {
      title: 'Conectó Mercado Pago',
      date: milestones.mpConnectedAt,
      dot: 'var(--color-accent)',
    },
    milestones.lastBookingAt && {
      title: 'Última reserva',
      date: milestones.lastBookingAt,
      dot: '#6D4AB0',
    },
  ].filter(Boolean) as { title: string; date: string | null; dot: string }[];

  const tiles = [
    { label: 'Reservas totales', value: counts.bookings.toLocaleString('es') },
    { label: 'No-show', value: `${noShowRate.toFixed(1)}%` },
    { label: 'Staff activo', value: String(counts.staff) },
    { label: 'Servicios', value: String(counts.services) },
  ];

  return (
    <AdminShell actor={actor} title="Ficha de negocio">
      <Link
        href="/admin/negocios"
        className="text-ink-secondary hover:text-ink mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a negocios
      </Link>

      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center gap-3.5">
        <div className="bg-ink flex size-[52px] shrink-0 items-center justify-center rounded-[13px] text-xl font-extrabold text-white">
          {business.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-ink text-[23px] font-extrabold tracking-tight">{business.name}</h2>
            <Dot color={HEALTH_COLOR[health as keyof typeof HEALTH_COLOR]} />
          </div>
          <p className="text-ink-tertiary text-[13px]">
            /{business.slug} · {business.timezone} · Registrado {fmtDate(business.createdAt)}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Pill color={PLAN_COLOR[tier] ?? '#6A6A6A'}>Plan {PLAN_LABEL[tier] ?? tier}</Pill>
          <Pill color={STATE_COLOR[state]}>{STATE_LABEL[state]}</Pill>
          <a
            href={`/${business.bookingLocale}/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-accent inline-flex items-center gap-1.5 text-[13px] font-semibold"
          >
            Ver booking page
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {business.suspendedAt ? (
        <div className="mb-4 rounded-2xl border border-[#F3D3CB] bg-[#FDF3F0] px-5 py-4">
          <p className="text-warning text-[13px] font-bold">
            Cuenta suspendida el {fmtDate(business.suspendedAt)}
          </p>
          {business.suspendedReason ? (
            <p className="text-ink-secondary mt-1 text-[13px]">{business.suspendedReason}</p>
          ) : null}
          <p className="text-ink-tertiary mt-1 text-[12px]">
            Su booking page está fuera de línea y no puede recibir reservas.
          </p>
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="border-border bg-surface rounded-[13px] border p-4">
                <p className="text-ink-secondary mb-1.5 text-[11.5px]">{t.label}</p>
                <p className="text-ink text-[21px] font-extrabold tracking-tight">{t.value}</p>
              </div>
            ))}
          </div>

          <Panel>
            <PanelTitle aside={`${weekly.reduce((s, w) => s + w.count, 0)} reservas`}>
              Reservas · últimas 12 semanas
            </PanelTitle>
            <div className="px-5 pb-5">
              {weekly.length === 0 ? (
                <p className="text-ink-tertiary py-8 text-center text-[13px]">
                  Todavía no recibió ninguna reserva.
                </p>
              ) : (
                <div className="flex h-[140px] items-end gap-1.5">
                  {weekly.map((w) => (
                    <div
                      key={w.week}
                      className="bg-accent/85 flex-1 rounded"
                      style={{ height: `${Math.max(4, (w.count / maxWeek) * 100)}%` }}
                      title={`${fmtDate(w.week)}: ${w.count}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelTitle aside="Anticipos · cuenta del negocio">Historial de pagos</PanelTitle>
            <div className="px-5 pb-4">
              {payments.length === 0 ? (
                <p className="text-ink-tertiary py-5 text-center text-[13px]">
                  Sin anticipos cobrados.
                </p>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    className="border-border flex items-center gap-3 border-t py-2.5 text-[13.5px] first:border-t-0"
                  >
                    <span className="text-ink-secondary flex-1">
                      {fmtDate(p.createdAt)} · {p.provider}
                    </span>
                    <span className="text-ink font-bold">{moneyMinor(p.amount, p.currency)}</span>
                    <Pill color={p.status === 'paid' ? '#008A05' : '#B45309'}>{p.status}</Pill>
                  </div>
                ))
              )}
              <p className="text-ink-tertiary mt-3 text-[11px]">
                Estos anticipos los cobra la cuenta de Mercado Pago DEL NEGOCIO. Ressy no recibe ni
                retiene ese dinero.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Timeline del negocio</PanelTitle>
            <div className="px-5 pb-5">
              {timeline.map((ev, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      className="size-[11px] rounded-full border-2 border-white"
                      style={{ backgroundColor: ev.dot, boxShadow: '0 0 0 1px var(--color-border)' }}
                    />
                    {i < timeline.length - 1 ? (
                      <span className="bg-border w-0.5 flex-1" />
                    ) : null}
                  </div>
                  <div className="pb-4">
                    <p className="text-ink text-[13.5px] font-semibold">{ev.title}</p>
                    <p className="text-ink-tertiary text-[12px]">
                      {ev.date ? fmtDate(ev.date) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              aside={
                <Link href={`/admin/auditoria?negocio=${business.id}`} className="text-accent">
                  Ver todo →
                </Link>
              }
            >
              Acciones de admin sobre esta cuenta
            </PanelTitle>
            <div className="px-5 pb-4">
              {audit.rows.length === 0 ? (
                <p className="text-ink-tertiary py-5 text-center text-[13px]">
                  Nadie del equipo tocó esta cuenta todavía.
                </p>
              ) : (
                audit.rows.map((r) => (
                  <div
                    key={r.id}
                    className="border-border flex items-center gap-3 border-t py-2.5 text-[13px] first:border-t-0"
                  >
                    <span className="text-ink flex-1 font-semibold">
                      {ACTION_LABEL[r.action] ?? r.action}
                    </span>
                    <span className="text-ink-secondary truncate">{r.adminEmail}</span>
                    <span className="text-ink-tertiary text-[12px] whitespace-nowrap">
                      {fmtDateTime(r.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        {/* Columna derecha: acciones */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Panel>
            <div className="p-5">
              <h2 className="text-ink mb-1 text-[15px] font-bold">Plan y suscripción</h2>
              <dl className="mt-3 flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-secondary">Plan</dt>
                  <dd className="text-ink font-semibold">{PLAN_LABEL[tier] ?? tier}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-secondary">Estado</dt>
                  <dd className="text-ink font-semibold">{subscription?.status ?? '—'}</dd>
                </div>
                {subscription?.isTrial ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-secondary">Trial vence</dt>
                    <dd className="text-ink font-semibold">
                      {fmtDate(subscription.trialEndsAt)} ({timeAgo(subscription.trialEndsAt)})
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-secondary">Período paga hasta</dt>
                  <dd className="text-ink font-semibold">
                    {fmtDate(subscription?.currentPeriodEnd)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-secondary">Cobro</dt>
                  <dd className="text-ink font-semibold">
                    {subscription?.billingProvider ?? 'sin billing externo'}
                  </dd>
                </div>
                {subscription?.cancelAtPeriodEnd ? (
                  <p className="text-warning text-[12px] font-semibold">
                    Cancela al final del período.
                  </p>
                ) : null}
                <div className="border-border mt-1 flex justify-between gap-3 border-t pt-2">
                  <dt className="text-ink-secondary">MRR aportado</dt>
                  <dd className="text-ink font-bold">
                    {mrr > 0 ? money(mrr, business.currency) : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </Panel>

          <SupportActions
            businessId={business.id}
            businessName={business.name}
            currentTier={tier}
            isSuspended={Boolean(business.suspendedAt)}
            canDoDestructive={actor.role === 'owner'}
          />
        </div>
      </div>
    </AdminShell>
  );
}
