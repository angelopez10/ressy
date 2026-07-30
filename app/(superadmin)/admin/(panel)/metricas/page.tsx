import { AdminShell } from '@/components/admin/AdminShell';
import { FunnelBar, Panel, PanelTitle } from '@/components/admin/primitives';
import { requireAdmin } from '@/lib/admin/guard';
import { getOverviewStats } from '@/lib/admin/queries';

/**
 * Métricas de producto — SEGUNDA PASADA.
 *
 * La división es la del CLAUDE.md: lo que la DB sabe con certeza sale de la DB;
 * lo que solo se ve en el navegador (dónde abandona la gente dentro de la
 * booking page) sale de PostHog. Reconstruir los embudos de PostHog acá sería
 * duplicar una herramienta que ya hace eso mejor: la idea es enlazar/embeber.
 */
export default async function MetricasPage() {
  const actor = await requireAdmin();
  const stats = await getOverviewStats(actor, '90d');
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.posthog.com';

  return (
    <AdminShell actor={actor} title="Métricas de producto">
      <div className="flex flex-col gap-4">
        <Panel>
          <PanelTitle aside="Desde la DB · exacto">Embudo de activación (90 días)</PanelTitle>
          <div className="flex flex-col gap-3.5 px-5 pb-5">
            <FunnelBar label="Signups" n={stats.funnel.signups} total={stats.funnel.signups} color="var(--color-accent)" />
            <FunnelBar label="Onboarding completado" n={stats.funnel.onboarded} total={stats.funnel.signups} color="#3B8F86" />
            <FunnelBar label="Primera reserva" n={stats.funnel.firstBooking} total={stats.funnel.signups} color="#5BA69E" />
          </div>
        </Panel>

        <Panel>
          <PanelTitle aside="Segunda pasada">Lo que vive en PostHog</PanelTitle>
          <div className="px-5 pb-5">
            <p className="text-ink-secondary text-[13px]">
              Estas métricas dependen de eventos del navegador que esta DB no puede ver. Los
              eventos ya se emiten (sesión 12); falta armar las vistas:
            </p>
            <ul className="text-ink-secondary mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[13px]">
              <li>Embudo interno del onboarding (pasos 1 a 5)</li>
              <li>
                Embudo de la booking page: vio → eligió servicio → eligió horario → confirmó
              </li>
              <li>Retención por cohortes</li>
            </ul>
            <a
              href={host}
              target="_blank"
              rel="noreferrer"
              className="text-accent mt-4 inline-block text-[13px] font-semibold"
            >
              Abrir PostHog →
            </a>
            <p className="text-ink-tertiary mt-4 text-[11px]">
              El panel de admin no manda ni un evento a PostHog: la actividad del equipo de Ressy
              no debe mezclarse con la de los negocios, y no se mueve PII a lugares nuevos.
            </p>
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
