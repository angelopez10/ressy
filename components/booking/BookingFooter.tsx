import { getTranslations } from 'next-intl/server';

/**
 * Footer discreto "Powered by Ressy" de la booking page. Se renderiza SOLO
 * cuando el plan del negocio muestra la marca (Free): los planes pagos la quitan
 * (feature `poweredByRessy` en lib/plans/config.ts). Por eso vive en la página,
 * que conoce el negocio, y no en el layout compartido (que no ve el slug/tier).
 */
export async function BookingFooter() {
  const t = await getTranslations('booking');
  const tc = await getTranslations('common');

  return (
    <footer className="text-ink-tertiary text-small flex items-center justify-center gap-1.5 py-6">
      {t('poweredBy')} <span className="text-ink-secondary font-bold">{tc('brand')}</span>
    </footer>
  );
}
