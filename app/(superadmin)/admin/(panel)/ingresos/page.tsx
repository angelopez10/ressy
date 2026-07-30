import { AdminShell } from '@/components/admin/AdminShell';
import { Kpi, Panel, PanelTitle } from '@/components/admin/primitives';
import { requireAdmin } from '@/lib/admin/guard';
import { money, usd } from '@/lib/admin/format';
import { getOverviewStats } from '@/lib/admin/queries';

/**
 * Ingresos — SEGUNDA PASADA.
 *
 * Se muestra lo que ya es exacto hoy (MRR por moneda y cuántos pagan, desde la
 * DB) y se dice sin vueltas qué falta. Preferimos un placeholder honesto a un
 * dashboard con movimientos del período inventados: para dinero, un número
 * aproximado sin aviso es peor que ningún número.
 */
export default async function IngresosPage() {
  const actor = await requireAdmin();
  const stats = await getOverviewStats(actor, '30d');

  return (
    <AdminShell actor={actor} title="Suscripciones e ingresos">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Kpi label="MRR total (aprox. USD)" value={usd(stats.mrr.totalUsd)} hint="convertido" />
          <Kpi label="MRR en USD" value={money(stats.mrr.usd, 'USD')} hint="exacto" />
          <Kpi label="MRR en CLP" value={money(stats.mrr.clp, 'CLP')} hint="exacto" />
          <Kpi label="Negocios pagando" value={String(stats.mrr.paying)} hint={`de ${stats.businesses.total}`} />
        </div>

        <Panel>
          <PanelTitle aside="Segunda pasada">Lo que falta acá</PanelTitle>
          <ul className="text-ink-secondary flex flex-col gap-2.5 px-5 pb-5 text-[13px]">
            <li>
              <strong className="text-ink">Movimientos del período</strong> (nuevas, upgrades,
              downgrades, cancelaciones): necesita historia de cambios de plan. Los snapshots
              diarios de MRR ya la empiezan a acumular; con unas semanas de datos esto sale solo.
            </li>
            <li>
              <strong className="text-ink">Dunning</strong> (quién está por caer): hoy se ve como
              alerta en el Overview y como filtro &ldquo;En gracia&rdquo; en Negocios. Falta la
              vista dedicada con los intentos de cobro.
            </li>
            <li>
              <strong className="text-ink">Conciliación con Mercado Pago</strong>: comparar los
              cobros de la cuenta de Ressy contra lo que dice esta DB. Es el trabajo más grande de
              los tres y necesita leer la API de MP con el token de Ressy.
            </li>
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}
