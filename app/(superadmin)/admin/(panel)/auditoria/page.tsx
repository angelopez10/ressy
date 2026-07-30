import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { EmptyState, Panel, Pill } from '@/components/admin/primitives';
import { requireAdmin } from '@/lib/admin/guard';
import { ACTION_LABEL, SENSITIVE_ACTIONS, fmtDateTime } from '@/lib/admin/format';
import { getAuditLog } from '@/lib/admin/queries';

/**
 * Auditoría: la contracara de las acciones sensibles.
 *
 * Va en la primera pasada aunque el prompt la dejaba abierta: registrar sin
 * poder leer no sirve de nada, y la tabla es barata. La bitácora es append-only
 * a nivel de Postgres (un trigger bloquea UPDATE/DELETE incluso para el service
 * role), así que lo que se ve acá es lo que pasó.
 */
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ negocio?: string; pagina?: string }>;
}) {
  const actor = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);

  const { rows, total, perPage } = await getAuditLog(actor, {
    businessId: sp.negocio,
    page,
    perPage: 50,
  });
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <AdminShell actor={actor} title="Auditoría">
      <div className="flex flex-col gap-4">
        <div className="text-ink-secondary bg-accent-soft flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px]">
          <ShieldCheck className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Registro inmutable de todo lo que el equipo de Ressy hace sobre cuentas de clientes.
            Nadie —ni con la clave de servicio— puede editar o borrar una fila.
            {sp.negocio ? (
              <>
                {' '}
                Filtrando por un negocio.{' '}
                <Link href="/admin/auditoria" className="text-accent font-semibold">
                  Ver todo
                </Link>
              </>
            ) : null}
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Sin registros todavía"
            body="Acá van a aparecer los ingresos al panel, las impersonaciones y los cambios sobre cuentas."
          />
        ) : (
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-alt text-ink-secondary text-[11.5px] font-bold">
                    <th scope="col" className="px-3.5 py-3">
                      Acción
                    </th>
                    <th scope="col" className="px-3.5 py-3">
                      Admin
                    </th>
                    <th scope="col" className="px-3.5 py-3">
                      Negocio
                    </th>
                    <th scope="col" className="px-3.5 py-3">
                      Detalle
                    </th>
                    <th scope="col" className="px-3.5 py-3 text-right">
                      Cuándo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const sensitive = SENSITIVE_ACTIONS.has(r.action);
                    const detail = Object.entries(r.payload)
                      .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(' · ');
                    return (
                      <tr key={r.id} className="border-border hover:bg-surface-alt border-t">
                        <td className="px-3.5 py-2.5 align-middle">
                          {sensitive ? (
                            <Pill color="#B45309">{ACTION_LABEL[r.action] ?? r.action}</Pill>
                          ) : (
                            <span className="text-ink-secondary text-[13px]">
                              {ACTION_LABEL[r.action] ?? r.action}
                            </span>
                          )}
                        </td>
                        <td className="text-ink px-3.5 py-2.5 text-[13px] align-middle">
                          {r.adminEmail}
                        </td>
                        <td className="px-3.5 py-2.5 text-[13px] align-middle">
                          {r.businessId ? (
                            <Link
                              href={`/admin/negocios/${r.businessId}`}
                              className="text-accent font-semibold"
                            >
                              {r.businessName ?? r.businessId.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-ink-tertiary">—</span>
                          )}
                        </td>
                        <td className="text-ink-secondary max-w-[320px] truncate px-3.5 py-2.5 text-[12.5px] align-middle">
                          {detail || '—'}
                        </td>
                        <td className="text-ink-tertiary px-3.5 py-2.5 text-right text-[12px] whitespace-nowrap align-middle">
                          {fmtDateTime(r.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-ink-secondary text-[13px]">
              Página {page} de {pages} · {total} registros
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`?${new URLSearchParams({ ...(sp.negocio ? { negocio: sp.negocio } : {}), pagina: String(page - 1) })}`}
                  className="border-border text-ink hover:bg-surface-alt rounded-full border px-4 py-2 text-[13px] font-semibold"
                >
                  Anterior
                </Link>
              ) : null}
              {page < pages ? (
                <Link
                  href={`?${new URLSearchParams({ ...(sp.negocio ? { negocio: sp.negocio } : {}), pagina: String(page + 1) })}`}
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
