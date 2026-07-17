import { useTranslations } from 'next-intl';
import { CalendarDays, Users, Scissors, UserRound, BarChart3, Settings } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';

// Iconos: Lucide, 20px, color ink-secondary (CLAUDE.md §5).
const NAV_ITEMS = [
  { key: 'agenda', href: '/dashboard', Icon: CalendarDays },
  { key: 'services', href: '/dashboard', Icon: Scissors },
  { key: 'staff', href: '/dashboard', Icon: Users },
  { key: 'customers', href: '/dashboard', Icon: UserRound },
  { key: 'reports', href: '/dashboard', Icon: BarChart3 },
  { key: 'settings', href: '/dashboard', Icon: Settings },
] as const;

/**
 * Shell de navegación del dashboard. Sin auth ni estado activo real todavía:
 * todos los items apuntan a `/dashboard` hasta que existan esas rutas.
 */
export function DashboardSidebar() {
  const t = useTranslations('dashboard.nav');
  const tCommon = useTranslations('common');

  return (
    <aside className="border-border bg-surface hidden w-64 shrink-0 border-r lg:block">
      <div className="flex h-20 items-center px-6">
        <Link href="/" className="text-h3 text-ink font-extrabold tracking-tight">
          {tCommon('brand')}
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map(({ key, href, Icon }, index) => (
          <Link
            key={key}
            href={href}
            aria-current={index === 0 ? 'page' : undefined}
            className={
              index === 0
                ? 'text-small rounded-input bg-accent-soft text-accent flex items-center gap-3 px-3 py-2.5 font-semibold'
                : 'text-small rounded-input text-ink-secondary hover:bg-surface-alt hover:text-ink flex items-center gap-3 px-3 py-2.5 font-semibold transition-colors'
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {t(key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
