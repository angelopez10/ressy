import type { ReactNode } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

/**
 * Shell del dashboard. Sin auth: la protección de rutas llega junto a
 * Supabase Auth en una sesión posterior.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-alt flex min-h-screen">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface flex h-20 items-center justify-end border-b px-6">
          <LocaleSwitcher />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
