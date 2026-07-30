import { getTranslations } from 'next-intl/server';
import { PauseCircle } from 'lucide-react';

/**
 * Pantalla que ve el dueño cuando el equipo de Ressy suspendió su cuenta.
 *
 * Existe porque suspender apaga `is_published`, y sin esto el dueño caería en
 * el onboarding sin ninguna explicación —el peor final posible para alguien que
 * necesita contactarnos—. Va con i18n: esta sí la ve el cliente (CLAUDE.md §6).
 */
export async function SuspendedAccount({
  reason,
  businessName,
  locale,
}: {
  reason: string | null;
  businessName: string;
  locale: string;
}) {
  const t = await getTranslations('dashboard.suspended');

  return (
    <div className="bg-surface-alt flex min-h-screen items-center justify-center p-6">
      <div className="rounded-card border-border bg-surface w-full max-w-lg border p-8">
        <div className="bg-warning-soft text-warning mb-5 inline-flex size-12 items-center justify-center rounded-full">
          <PauseCircle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-h3 text-ink mb-2">{t('title')}</h1>
        <p className="text-body text-ink-secondary mb-1">{businessName}</p>
        <p className="text-body text-ink-secondary mb-5">{t('body')}</p>

        {reason ? (
          <div className="rounded-input border-border bg-surface-alt mb-5 border p-4">
            <p className="text-small text-ink-tertiary mb-1 font-semibold">{t('reason')}</p>
            <p className="text-body text-ink">{reason}</p>
          </div>
        ) : null}

        <p className="text-small text-ink-secondary">
          {t('contact')}{' '}
          <a className="text-accent font-semibold" href="mailto:hola@getressy.com">
            hola@getressy.com
          </a>
        </p>

        <form action="/api/auth/signout" method="post" className="mt-6">
          <button type="submit" className="text-small text-ink-secondary hover:text-ink font-semibold">
            {locale === 'en' ? 'Sign out' : 'Cerrar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
