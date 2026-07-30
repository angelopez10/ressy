import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AdminActor } from '@/lib/admin/guard';
import { AdminNav } from './AdminNav';
import { AdminSignOut } from './AdminSignOut';

/**
 * Shell del panel interno, porteado del mockup `Ressy Super Admin`:
 * sidebar oscuro (#1C1E1D), badge ADMIN en el acento de marca, topbar blanca
 * con el chip "PANEL INTERNO".
 *
 * El contraste con el producto es intencional y es un requisito, no una
 * decisión estética: mirando media pantalla tiene que quedar claro que estás en
 * la torre de control y no en el dashboard de un negocio.
 *
 * Responsive hasta tablet: en pantallas chicas el sidebar pasa a una barra
 * horizontal scrolleable. No se optimiza para móvil (es herramienta de
 * escritorio).
 */
export function AdminShell({
  actor,
  title,
  actions,
  children,
}: {
  actor: AdminActor;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const initials = (actor.name ?? actor.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex min-h-screen flex-col bg-[#1C1E1D] lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 p-3 lg:w-[236px] lg:px-3 lg:py-[18px]">
        <div className="flex items-center gap-2.5 px-2 pt-0.5">
          <span className="text-lg font-extrabold tracking-tight text-[#F2F2F0]">ressy</span>
          <span className="bg-accent rounded-md px-2 py-[3px] text-[10px] font-extrabold tracking-[0.08em] text-white">
            ADMIN
          </span>
        </div>
        <p className="hidden px-2 text-[11px] text-[#F2F2F080] lg:block">Torre de control interna</p>

        <AdminNav />

        <div className="hidden items-center gap-2.5 border-t border-white/10 pt-3 lg:flex">
          <div className="bg-accent flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#F2F2F0]">
              {actor.name ?? actor.email}
            </p>
            <p className="text-[11px] text-[#F2F2F080]">
              {actor.role === 'owner' ? 'Owner · Ressy' : 'Soporte · Ressy'}
            </p>
          </div>
          <ShieldCheck className="text-accent size-4 shrink-0" aria-hidden="true" />
        </div>
      </aside>

      <main className="bg-surface-alt flex min-w-0 flex-1 flex-col lg:rounded-tl-2xl">
        <header className="border-border bg-surface flex flex-wrap items-center justify-between gap-4 border-b px-5 py-3.5 sm:px-6 lg:rounded-tl-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-ink truncate text-[21px] font-bold tracking-tight">{title}</h1>
            <span className="text-accent bg-accent-soft rounded-md px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] whitespace-nowrap">
              PANEL INTERNO
            </span>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <div className="bg-border hidden h-6 w-px sm:block" />
            <AdminSignOut />
          </div>
        </header>

        <div className="flex-1 px-5 py-6 pb-16 sm:px-6">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
