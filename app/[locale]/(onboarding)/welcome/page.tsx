import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getUser } from '@/lib/auth/session';
import { getDashboardContext } from '@/lib/dashboard/context';
import { WelcomeView } from '@/components/onboarding/WelcomeView';
import type { Locale } from '@/lib/i18n/routing';

type Props = { params: Promise<{ locale: Locale }> };

/**
 * Celebración post-suscripción del onboarding. Es el `back_url` cuando el negocio
 * eligió un plan PAGO en el paso 5 y pagó en Mercado Pago. Standalone (sin el
 * chrome del dashboard), como el paso "Listo". Reconcilia el plan al montar.
 */
export default async function WelcomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  return (
    <main className="bg-surface-alt flex min-h-screen flex-col items-center px-5 py-8 sm:py-12">
      <div className="w-full max-w-xl">
        <div className="border-border bg-surface rounded-card border p-6 sm:p-8">
          <WelcomeView
            slug={ctx.business.slug}
            accentColor={ctx.business.accentColor ?? '#348D83'}
            locale={locale}
          />
        </div>
      </div>
    </main>
  );
}
