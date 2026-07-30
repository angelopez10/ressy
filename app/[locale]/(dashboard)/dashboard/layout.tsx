import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LogOut } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardBanners } from '@/components/dashboard/DashboardBanners';
import { SuspendedAccount } from '@/components/dashboard/SuspendedAccount';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { ImpersonationBar } from '@/components/admin/ImpersonationBar';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ToastProvider } from '@/components/ui/Toast';
import { getUser } from '@/lib/auth/session';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getTenantDb } from '@/lib/dashboard/tenant';
import { getPlanUsage } from '@/lib/plans/status';

/**
 * Shell del dashboard, con guard (CLAUDE.md §9): sin sesión → login; sin negocio
 * o a medio configurar → onboarding. Solo un negocio publicado entra aquí.
 *
 * Dos excepciones al camino normal:
 *  - cuenta suspendida por Ressy → pantalla dedicada, no rebote al onboarding;
 *  - impersonación de soporte → sin redirects, con barra roja y sin analytics.
 */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('dashboard');

  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  const ctx = await getDashboardContext();
  if (!ctx) redirect(`/${locale}/onboarding`);

  // Bajo impersonación de soporte no se aplican los redirects del dueño: el
  // admin necesita poder mirar un negocio a medio configurar o suspendido, que
  // es justo cuando lo llaman.
  if (!ctx.impersonation) {
    // Suspender apaga `is_published`, así que el chequeo de suspensión va PRIMERO:
    // si no, el dueño terminaría en el onboarding sin entender por qué.
    if (ctx.business.suspendedAt) {
      return (
        <SuspendedAccount
          reason={ctx.business.suspendedReason}
          businessName={ctx.business.name}
          locale={locale}
        />
      );
    }
    if (!ctx.business.isPublished) redirect(`/${locale}/onboarding`);
  }

  // Uso de reservas para el banner de tope. Solo importa cuando el plan tiene
  // límite finito (Free); en planes ∞ no se pasa nada al banner (evita Infinity).
  const usage = await getPlanUsage(await getTenantDb(), ctx.business.id, ctx.tier);
  const bookingsBanner = Number.isFinite(usage.bookings.limit)
    ? { used: usage.bookings.used, limit: usage.bookings.limit, atLimit: usage.bookings.atLimit }
    : null;

  return (
    <ToastProvider>
      {ctx.impersonation ? (
        <ImpersonationBar
          businessName={ctx.business.name}
          adminEmail={ctx.impersonation.adminEmail}
          expiresAt={ctx.impersonation.expiresAt}
        />
      ) : null}
      {/* Sin analytics durante una impersonación: la actividad del equipo de
          Ressy no debe ensuciar los datos de comportamiento del negocio. */}
      {ctx.impersonation ? null : (
        <PostHogProvider
          userId={user.id}
          businessId={ctx.business.id}
          plan={ctx.tier}
          locale={locale === 'en' ? 'en' : 'es'}
        />
      )}
      <div className="bg-surface-alt flex min-h-screen flex-col lg:flex-row">
        <DashboardSidebar businessName={ctx.business.name} planTier={ctx.tier} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border bg-surface flex h-16 items-center justify-end gap-3 border-b px-4 sm:h-20 sm:px-6">
            <LocaleSwitcher />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-ink-secondary hover:text-ink text-small flex items-center gap-1.5 font-semibold"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {t('signOut')}
              </button>
            </form>
          </header>
          <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
            <DashboardBanners trial={ctx.trial} bookings={bookingsBanner} />
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
