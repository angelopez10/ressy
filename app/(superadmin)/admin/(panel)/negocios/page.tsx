import Link from 'next/link';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { BusinessFiltersBar } from '@/components/admin/BusinessFiltersBar';
import { Dot, EmptyState, Panel, Pill } from '@/components/admin/primitives';
import { requireAdmin } from '@/lib/admin/guard';
import {
  HEALTH_COLOR,
  HEALTH_LABEL,
  PLAN_COLOR,
  PLAN_LABEL,
  STATE_COLOR,
  STATE_LABEL,
  fmtDate,
  money,
  timeAgo,
} from '@/lib/admin/format';
import { getBusinessesPage, type SortKey } from '@/lib/admin/queries';

/**
 * Negocios: la tabla densa desde la que se opera la beta.
 *
 * Filtro, orden y paginación son SERVER-SIDE (una sola RPC que además agrega
 * reservas y última actividad por fila). Traer miles de filas al cliente para
 * filtrarlas ahí no escala y además significaría mandar datos de todos los
 * negocios al browser sin necesidad.
 *
 * Todo el estado vive en la URL, así que cualquier vista es compartible por
 * link con el resto del equipo.
 */

const COLUMNS: { key: SortKey | null; label: string; align?: 'right' }[] = [
  { key: 'name', label: 'Negocio' },
  { key: null, label: 'Plan' },
  { key: null, label: 'Estado' },
  { key: null, label: 'Moneda' },
  { key: 'created', label: 'Registro' },
  { key: 'activity', label: 'Últ. actividad', align: 'right' },
  { key: 'bookings', label: 'Reservas', align: 'right' },
  { key: 'mrr', label: 'MRR', align: 'right' },
];

function isSortKey(v: unknown): v is SortKey {
  return v === 'name' || v === 'created' || v === 'activity' || v === 'bookings' || v === 'mrr';
}

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireAdmin();
  const sp = await searchParams;

  const sort: SortKey = isSortKey(sp.orden) ? sp.orden : 'mrr';
  const dir: 'asc' | 'desc' = sp.dir === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(sp.pagina) || 1);

  const result = await getBusinessesPage(actor, {
    search: sp.q,
    plan: sp.plan,
    state: sp.estado,
    currency: sp.moneda,
    health: sp.salud,
    trialEnding: sp.trial === '1',
    sort,
    dir,
    page,
  });

  /** Link de orden: mismo campo alterna la dirección, campo nuevo arranca desc. */
  function sortHref(key: SortKey): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) next.set(k, v);
    next.set('orden', key);
    next.set('dir', sort === key && dir === 'desc' ? 'asc' : 'desc');
    next.delete('pagina');
    return `?${next.toString()}`;
  }

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) next.set(k, v);
    next.set('pagina', String(target));
    return `?${next.toString()}`;
  }

  const th =
    'text-ink-secondary px-3.5 py-3 text-[11.5px] font-bold tracking-wide whitespace-nowrap';
  const td = 'text-ink px-3.5 py-3 text-[13px] align-middle';

  return (
    <AdminShell actor={actor} title="Negocios">
      <div className="flex flex-col gap-4">
        <BusinessFiltersBar total={result.total} />

        {result.rows.length === 0 ? (
          <EmptyState
            title="Ningún negocio coincide"
            body="Probá aflojar los filtros o buscar por otro nombre o slug."
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-alt">
                    {COLUMNS.map((col) => (
                      <th
                        key={col.label}
                        scope="col"
                        className={`${th} ${col.align === 'right' ? 'text-right' : ''}`}
                        aria-sort={
                          col.key === sort ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        {col.key ? (
                          <Link
                            href={sortHref(col.key)}
                            className="hover:text-ink inline-flex items-center gap-1"
                          >
                            {col.label}
                            {col.key === sort ? (
                              dir === 'asc' ? (
                                <ChevronUp className="size-3" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="size-3" aria-hidden="true" />
                              )
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-35" aria-hidden="true" />
                            )}
                          </Link>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((b) => (
                    <tr key={b.id} className="border-border hover:bg-surface-alt border-t">
                      <td className="px-3.5 py-2.5 align-middle">
                        <Link href={`/admin/negocios/${b.id}`} className="flex items-center gap-2.5">
                          <Dot color={HEALTH_COLOR[b.health]} title={HEALTH_LABEL[b.health]} />
                          <span className="min-w-0">
                            <span className="text-ink block text-[13.5px] font-semibold">
                              {b.name}
                            </span>
                            <span className="text-ink-tertiary block text-[11.5px]">/{b.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={td}>
                        <Pill color={PLAN_COLOR[b.tier] ?? '#6A6A6A'}>
                          {PLAN_LABEL[b.tier] ?? b.tier}
                        </Pill>
                      </td>
                      <td className={td}>
                        <Pill color={STATE_COLOR[b.state]}>{STATE_LABEL[b.state]}</Pill>
                      </td>
                      <td className={td}>{b.currency}</td>
                      <td className={td}>{fmtDate(b.createdAt)}</td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        {timeAgo(b.lastActivity)}
                      </td>
                      <td className={`${td} text-right`}>{b.bookings}</td>
                      <td className={`${td} text-right font-semibold`}>
                        {b.mrrAmount > 0 ? money(b.mrrAmount, b.currency) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {result.pages > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-ink-secondary text-[13px]">
              Página {result.page} de {result.pages} · {result.total} negocios
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link
                  href={pageHref(result.page - 1)}
                  className="border-border text-ink hover:bg-surface-alt rounded-full border px-4 py-2 text-[13px] font-semibold"
                >
                  Anterior
                </Link>
              ) : null}
              {result.page < result.pages ? (
                <Link
                  href={pageHref(result.page + 1)}
                  className="border-border text-ink hover:bg-surface-alt rounded-full border px-4 py-2 text-[13px] font-semibold"
                >
                  Siguiente
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
