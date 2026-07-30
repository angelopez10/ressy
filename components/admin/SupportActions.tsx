'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarPlus,
  Info,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  cancelSubscription,
  changePlan,
  extendTrial,
  impersonateBusiness,
  setSuspended,
  type AdminActionResult,
} from '@/lib/admin/actions';

/**
 * Acciones de soporte de la ficha.
 *
 * Dos bloques separados visualmente, como en el mockup: las operaciones
 * seguras arriba y la ZONA SENSIBLE (destructivas) abajo, con su propio borde
 * rojo. La separación no es decorativa: evita el clic por inercia en la acción
 * de al lado.
 *
 * TODAS piden motivo antes de ejecutar. El motivo no es burocracia: es lo que
 * hace que el audit log sirva para algo dentro de tres meses, cuando nadie se
 * acuerde por qué esa cuenta quedó suspendida.
 */

type Pending = null | 'impersonate' | 'trial' | 'plan' | 'suspend' | 'cancel';

const TIERS = [
  { id: 'free', label: 'Free' },
  { id: 'solo', label: 'Solo' },
  { id: 'team', label: 'Team' },
  { id: 'studio', label: 'Studio' },
];

export function SupportActions({
  businessId,
  businessName,
  currentTier,
  isSuspended,
  canDoDestructive,
}: {
  businessId: string;
  businessName: string;
  currentTier: string;
  isSuspended: boolean;
  /** Solo el rol `owner` suspende, cancela o cambia planes. */
  canDoDestructive: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('14');
  const [tier, setTier] = useState(currentTier);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(null);
    setReason('');
    setError(null);
  }

  function run(fn: () => Promise<AdminActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      reset();
      if (after) after();
      else router.refresh();
    });
  }

  const safeBtn =
    'border-border text-ink hover:border-ink-tertiary hover:bg-surface-alt flex items-center gap-2.5 rounded-full border bg-white px-4 py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-50';
  const dangerBtn =
    'text-warning flex items-center gap-2.5 rounded-full border border-[#F3D3CB] bg-white px-4 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-[#FDF3F0] disabled:opacity-50';

  /** Confirmación inline: el formulario reemplaza al botón en su lugar. */
  function Confirm({
    title,
    body,
    danger,
    confirmLabel,
    children,
    onConfirm,
  }: {
    title: string;
    body: string;
    danger?: boolean;
    confirmLabel: string;
    children?: React.ReactNode;
    onConfirm: () => void;
  }) {
    return (
      <div
        className={`rounded-2xl border p-4 ${danger ? 'border-[#F3D3CB] bg-[#FDF3F0]' : 'border-border bg-surface-alt'}`}
      >
        <p className="text-ink text-[13.5px] font-bold">{title}</p>
        <p className="text-ink-secondary mt-1 text-[12.5px]">{body}</p>

        {children}

        <label className="mt-3 block">
          <span className="text-ink-secondary text-[12px] font-semibold">Motivo (queda en el log)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            autoFocus
            className="border-border focus:border-accent mt-1 w-full rounded-[10px] border bg-white px-3 py-2 text-[13px] outline-none"
            placeholder="Ej: pidió más tiempo por mail, ticket #42"
          />
        </label>

        {error ? (
          <p role="alert" className="text-warning mt-2 text-[12.5px] font-semibold">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || reason.trim().length < 3}
            className={`rounded-full px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50 ${danger ? 'bg-warning' : 'bg-accent'}`}
          >
            {pending ? 'Aplicando…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="text-ink-secondary hover:text-ink px-3 py-2 text-[13px] font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* --- Operaciones seguras --- */}
      <div className="border-border bg-surface rounded-2xl border p-5">
        <h2 className="text-ink text-[15px] font-bold">Acciones de soporte</h2>
        <p className="text-ink-secondary mt-0.5 mb-3.5 text-[12px]">
          Operaciones seguras sobre esta cuenta.
        </p>

        <div className="flex flex-col gap-2.5">
          {open === 'impersonate' ? (
            <Confirm
              title={`Impersonar ${businessName}`}
              body="Vas a ver su dashboard en SOLO LECTURA durante 30 minutos, con una barra roja visible todo el tiempo. Queda registrado quién, cuándo y por qué."
              confirmLabel="Impersonar"
              onConfirm={() =>
                run(
                  () => impersonateBusiness({ businessId, reason }),
                  () => {
                    router.push('/es/dashboard');
                    router.refresh();
                  },
                )
              }
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen('impersonate')}
                className="bg-accent hover:bg-accent-hover flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors"
              >
                <UserCheck className="size-4" aria-hidden="true" />
                Impersonar cuenta
              </button>
              <p className="text-ink-tertiary -mt-0.5 flex items-center gap-1.5 text-[11px]">
                <Info className="size-3" aria-hidden="true" />
                Solo lectura · queda en el log de auditoría.
              </p>
            </>
          )}

          {open === 'trial' ? (
            <Confirm
              title="Extender el trial"
              body="Suma días al final del trial. Si ya venció, se cuenta desde ahora."
              confirmLabel="Extender"
              onConfirm={() => run(() => extendTrial({ businessId, days: Number(days) }))}
            >
              <label className="mt-3 block">
                <span className="text-ink-secondary text-[12px] font-semibold">Días</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="border-border focus:border-accent mt-1 w-24 rounded-[10px] border bg-white px-3 py-2 text-[13px] outline-none"
                />
              </label>
            </Confirm>
          ) : (
            <button type="button" onClick={() => setOpen('trial')} className={safeBtn}>
              <CalendarPlus className="text-ink-secondary size-4" aria-hidden="true" />
              Extender trial
            </button>
          )}

          {canDoDestructive ? (
            open === 'plan' ? (
              <Confirm
                title="Cambiar el plan a mano"
                body="Cambia el plan en Ressy. NO modifica el cobro en Mercado Pago: si el negocio paga, hay que ajustar la suscripción por separado."
                confirmLabel="Cambiar plan"
                onConfirm={() => run(() => changePlan({ businessId, tier, reason }))}
              >
                <label className="mt-3 block">
                  <span className="text-ink-secondary text-[12px] font-semibold">Nuevo plan</span>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="border-border focus:border-accent mt-1 w-full rounded-[10px] border bg-white px-3 py-2 text-[13px] outline-none"
                  >
                    {TIERS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                        {t.id === currentTier ? ' (actual)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </Confirm>
            ) : (
              <button type="button" onClick={() => setOpen('plan')} className={safeBtn}>
                <RefreshCw className="text-ink-secondary size-4" aria-hidden="true" />
                Cambiar plan manualmente
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* --- Zona sensible --- */}
      {canDoDestructive ? (
        <div className="rounded-2xl border border-[#F3D3CB] bg-white p-5">
          <p className="text-warning flex items-center gap-2 text-[13px] font-extrabold tracking-wide">
            <AlertTriangle className="size-4" aria-hidden="true" />
            ZONA SENSIBLE
          </p>
          <p className="text-ink-secondary mt-0.5 mb-3.5 text-[12px]">
            Acciones destructivas. Requieren confirmación y motivo.
          </p>

          <div className="flex flex-col gap-2.5">
            {open === 'suspend' ? (
              <Confirm
                danger
                title={isSuspended ? `Reactivar ${businessName}` : `Suspender ${businessName}`}
                body={
                  isSuspended
                    ? 'Vuelve a publicar su booking page tal como estaba antes de la suspensión.'
                    : 'Su booking page queda FUERA DE LÍNEA de inmediato y deja de recibir reservas. El dueño ve una pantalla explicando por qué.'
                }
                confirmLabel={isSuspended ? 'Reactivar' : 'Suspender'}
                onConfirm={() =>
                  run(() => setSuspended({ businessId, suspended: !isSuspended, reason }))
                }
              />
            ) : (
              <button type="button" onClick={() => setOpen('suspend')} className={dangerBtn}>
                {isSuspended ? (
                  <PlayCircle className="size-4" aria-hidden="true" />
                ) : (
                  <PauseCircle className="size-4" aria-hidden="true" />
                )}
                {isSuspended ? 'Reactivar cuenta' : 'Suspender cuenta'}
              </button>
            )}

            {open === 'cancel' ? (
              <Confirm
                danger
                title="Cancelar la suscripción"
                body="Marca la suscripción para bajar a Free al final del período pagado. No corta el acceso hoy ni reembolsa nada."
                confirmLabel="Cancelar suscripción"
                onConfirm={() => run(() => cancelSubscription({ businessId, reason }))}
              />
            ) : (
              <button type="button" onClick={() => setOpen('cancel')} className={dangerBtn}>
                <XCircle className="size-4" aria-hidden="true" />
                Cancelar suscripción
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-ink-tertiary px-1 text-[12px]">
          Suspender, cancelar y cambiar planes están reservados al rol <strong>owner</strong>.
        </p>
      )}
    </div>
  );
}
