import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BookingHeader } from '@/components/booking/BookingHeader';

/**
 * Chrome de la booking page pública. Mobile-first: a 390px es una columna
 * angosta con la card (es LA pantalla del móvil). En desktop (`lg`) el ancho
 * crece para el layout de dos paneles del mockup de escritorio (perfil + reserva);
 * las cards las dibuja `BookingFlow`, no este layout. Fondo surface-alt y footer
 * discreto "Powered by Ressy".
 */
export default async function BookingLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('booking');
  const tc = await getTranslations('common');

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
        <main className="flex-1 sm:my-4 lg:my-0">{children}</main>
        <footer className="text-ink-tertiary text-small flex items-center justify-center gap-1.5 py-6">
          {t('poweredBy')} <span className="text-ink-secondary font-bold">{tc('brand')}</span>
        </footer>
      </div>
    </div>
  );
}
