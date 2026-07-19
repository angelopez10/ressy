import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LogOut } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ToastProvider } from '@/components/ui/Toast';
import { getUser } from '@/lib/auth/session';
import { getDashboardContext } from '@/lib/dashboard/context';

/**
 * Shell del dashboard, con guard (CLAUDE.md §9): sin sesión → login; sin negocio
 * o a medio configurar → onboarding. Solo un negocio publicado entra aquí.
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
  if (!ctx || !ctx.business.isPublished) redirect(`/${locale}/onboarding`);

  return (
    <ToastProvider>
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
          <main className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
