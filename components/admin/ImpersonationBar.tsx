'use client';

/**
 * Barra fija que se muestra MIENTRAS un admin de Ressy está impersonando a un
 * negocio. Es deliberadamente estridente y rompe la paleta del producto: el
 * requisito es que sea imposible confundir "estoy en soporte" con "estoy en el
 * dashboard de alguien". Es la única pantalla de Ressy donde eso vale más que
 * el design system.
 *
 * Solo la ve el equipo de Ressy, así que va en español y sin i18n.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut } from 'lucide-react';
import { stopImpersonation } from '@/lib/admin/actions';

export function ImpersonationBar({
  businessName,
  adminEmail,
  expiresAt,
}: {
  businessName: string;
  adminEmail: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minutesLeft] = useState(() =>
    Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000)),
  );

  function exit() {
    startTransition(async () => {
      await stopImpersonation();
      router.push('/admin');
      router.refresh();
    });
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#C13515] px-4 py-2.5 text-sm font-semibold text-white sm:px-6"
    >
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Modo soporte · estás viendo <strong>{businessName}</strong> como {adminEmail}
      </span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">SOLO LECTURA</span>
      <span className="text-xs font-medium text-white/80">
        {minutesLeft > 0 ? `expira en ~${minutesLeft} min` : 'expirando'}
      </span>
      <button
        type="button"
        onClick={exit}
        disabled={pending}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#C13515] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <LogOut className="size-3.5" aria-hidden="true" />
        {pending ? 'Saliendo…' : 'Salir del modo soporte'}
      </button>
    </div>
  );
}
