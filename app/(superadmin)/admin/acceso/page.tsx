import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { AccessForm } from '@/components/admin/AccessForm';
import { getAdminActor, requireAdminIdentity } from '@/lib/admin/guard';

/** Igual que el panel: jamás prerenderizada ni cacheada. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Step-up del panel: segundo factor para entrar.
 *
 * `requireAdminIdentity()` ya hace 404 si quien mira no es staff de Ressy, así
 * que esta pantalla ni siquiera existe para un dueño de negocio. Para quien sí
 * lo es, pide el código de 6 dígitos que se manda por email.
 */
export default async function AccesoPage() {
  // Si ya hay elevación vigente, no tiene sentido volver a pedir el código.
  const actor = await getAdminActor();
  if (actor) redirect('/admin');

  const identity = await requireAdminIdentity();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1C1E1D] p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight text-[#F2F2F0]">ressy</span>
          <span className="bg-accent rounded-md px-2 py-[3px] text-[10px] font-extrabold tracking-[0.08em] text-white">
            ADMIN
          </span>
        </div>

        <div className="bg-surface rounded-card p-7">
          <div className="bg-accent-soft text-accent mb-5 inline-flex size-11 items-center justify-center rounded-full">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>

          <h1 className="text-h3 text-ink mb-1.5">Verificación adicional</h1>
          <p className="text-body text-ink-secondary mb-6">
            Tu sesión de Ressy no alcanza para entrar al panel interno. Te mandamos un código de 6
            dígitos a <strong className="text-ink">{identity.email}</strong>.
          </p>

          <AccessForm />

          <p className="text-small text-ink-tertiary mt-6 border-t border-[color:var(--color-border)] pt-4">
            El código vence en 10 minutos y sirve una sola vez. La sesión del panel dura 8 horas y
            se puede cortar desde cualquier lado.
          </p>
        </div>
      </div>
    </div>
  );
}
