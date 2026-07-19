import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

/**
 * Barra superior de la booking page en DESKTOP: logo Ressy + señal de confianza
 * "Reserva segura" + toggle de idioma. En móvil no se muestra (el tope de la
 * pantalla es el back + progreso dentro de la card), por eso el layout la
 * envuelve en `hidden lg:block`.
 */
export async function BookingHeader() {
  const t = await getTranslations('booking');
  const tc = await getTranslations('common');

  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <span className="bg-accent flex size-9 items-center justify-center rounded-xl text-sm font-extrabold text-white lowercase">
            re
          </span>
          <span className="text-ink text-lg font-extrabold tracking-tight lowercase">
            {tc('brand')}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-ink-secondary text-small hidden items-center gap-1.5 font-medium sm:flex">
            <ShieldCheck className="text-success size-4" aria-hidden="true" />
            {t('secure')}
          </span>
          <LocaleSwitcher tone="solid" />
        </div>
      </div>
    </header>
  );
}
