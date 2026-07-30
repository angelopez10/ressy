'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOutAdmin } from '@/lib/admin/actions';

/**
 * Cierra la ELEVACIÓN del panel, no la sesión de Supabase: el admin sigue
 * logueado en Ressy como cualquier usuario, pero pierde el acceso interno hasta
 * volver a pasar el OTP. Es la salida rápida cuando dejás la máquina sola.
 */
export function AdminSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOutAdmin();
          router.push('/admin/acceso');
          router.refresh();
        })
      }
      className="text-ink-secondary hover:text-ink flex items-center gap-1.5 text-sm font-semibold disabled:opacity-60"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {pending ? 'Saliendo…' : 'Salir'}
    </button>
  );
}
