import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BookingHeader } from '@/components/booking/BookingHeader';

/**
 * Chrome de la booking page pública. Mobile-first: a 390px es una columna
 * angosta con la card (es LA pantalla del móvil). En desktop (`lg`) el ancho
 * crece para el layout de dos paneles del mockup de escritorio (perfil + reserva);
 * las cards las dibuja `BookingFlow`, no este layout.
 *
 * El footer "Powered by Ressy" NO va aquí: es una feature de plan (los pagos la
 * quitan) y este layout no conoce el negocio/tier. Lo renderiza la página con
 * <BookingFooter/> cuando corresponde.
 */
export default async function BookingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-alt flex min-h-screen flex-col">
      {/* Barra superior: solo desktop (móvil usa el back+progreso de la card). */}
      <div className="hidden lg:block">
        <BookingHeader />
      </div>

      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-0 sm:px-4 lg:max-w-6xl lg:px-6">
        {/* En móvil, el toggle de idioma va arriba a la derecha; en desktop está en el header. */}
        <div className="flex justify-end px-5 pt-4 lg:hidden">
          <LocaleSwitcher tone="solid" />
        </div>
        <main className="flex flex-1 flex-col sm:my-4 lg:my-0">{children}</main>
      </div>
    </div>
  );
}
