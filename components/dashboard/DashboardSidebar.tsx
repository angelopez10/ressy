'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart3,
  CalendarDays,
  Home,
  Scissors,
  Settings,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

const NAV: { key: string; href: string; Icon: LucideIcon }[] = [
  { key: 'home', href: '/dashboard', Icon: Home },
  { key: 'calendar', href: '/dashboard/calendar', Icon: CalendarDays },
  { key: 'clients', href: '/dashboard/clients', Icon: Users },
  { key: 'services', href: '/dashboard/services', Icon: Scissors },
  { key: 'team', href: '/dashboard/team', Icon: UserRound },
  { key: 'reports', href: '/dashboard/reports', Icon: BarChart3 },
  { key: 'settings', href: '/dashboard/settings', Icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navegación del dashboard. Desktop: sidebar fija. Móvil: tira horizontal de
 * íconos scrolleable bajo el header. El item activo se detecta con la ruta
 * (sin el prefijo de locale, que `usePathname` de next-intl ya quita).
 */
export function DashboardSidebar({
  businessName,
  planTier,
}: {
  businessName: string;
  planTier: string;
}) {
  const t = useTranslations('dashboard.nav');
  const tCommon = useTranslations('common');
  const tPlan = useTranslations('dashboard.settings.plan');
  const pathname = usePathname();

  return (
    <>
      {/* Desktop */}
      <aside className="border-border bg-surface hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-20 items-center px-6">
          <Link href="/dashboard" className="text-h3 text-ink font-extrabold tracking-tight">
            {tCommon('brand')}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {NAV.map(({ key, href, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-small rounded-input flex items-center gap-3 px-3 py-2.5 font-semibold transition-colors',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-secondary hover:bg-surface-alt hover:text-ink',
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {t(key)}
              </Link>
            );
          })}

          {/* Mejorar plan: separado abajo, con el plan actual como badge. */}
          <Link
            href="/dashboard/upgrade"
            aria-current={isActive(pathname, '/dashboard/upgrade') ? 'page' : undefined}
            className={cn(
              'text-small rounded-input mt-auto flex items-center gap-3 px-3 py-2.5 font-semibold transition-colors',
              isActive(pathname, '/dashboard/upgrade')
                ? 'bg-accent-soft text-accent'
                : 'text-ink-secondary hover:bg-surface-alt hover:text-ink',
            )}
          >
            <Zap className="size-5 shrink-0" aria-hidden="true" />
            {t('upgrade')}
            <span className="bg-accent-soft text-accent ml-auto rounded-full px-2 py-0.5 text-xs font-bold">
              {tPlan(`names.${planTier}`)}
            </span>
          </Link>
        </nav>

        <div className="border-border flex items-center gap-3 border-t p-4">
          <div className="bg-ink flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-ink truncate text-sm font-semibold">{businessName}</div>
            <div className="text-ink-secondary text-xs">{tPlan(`names.${planTier}`)}</div>
          </div>
        </div>
      </aside>

      {/* Móvil */}
      <nav className="border-border bg-surface flex gap-1 overflow-x-auto border-b px-2 py-2 lg:hidden">
        {NAV.map(({ key, href, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                active ? 'text-accent' : 'text-ink-secondary',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {t(key)}
            </Link>
          );
        })}
        <Link
          href="/dashboard/upgrade"
          aria-current={isActive(pathname, '/dashboard/upgrade') ? 'page' : undefined}
          className={cn(
            'flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            isActive(pathname, '/dashboard/upgrade') ? 'text-accent' : 'text-ink-secondary',
          )}
        >
          <Zap className="size-5" aria-hidden="true" />
          {t('upgrade')}
        </Link>
      </nav>
    </>
  );
}
