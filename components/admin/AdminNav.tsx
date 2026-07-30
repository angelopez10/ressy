'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Building2, DollarSign, Home, ScrollText } from 'lucide-react';

/**
 * Navegación del panel. Es lo único del shell que necesita ser cliente: marcar
 * la sección activa requiere el pathname, y no vale la pena propagarlo por
 * headers desde el middleware solo para esto.
 */

const NAV = [
  { href: '/admin', label: 'Overview', icon: Home, exact: true },
  { href: '/admin/negocios', label: 'Negocios', icon: Building2, exact: false },
  { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText, exact: false },
  { href: '/admin/ingresos', label: 'Ingresos', icon: DollarSign, exact: false },
  { href: '/admin/metricas', label: 'Métricas', icon: Activity, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 gap-0.5 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-sm whitespace-nowrap transition-colors',
              active
                ? 'bg-white/10 font-semibold text-[#F2F2F0]'
                : 'font-medium text-[#F2F2F080] hover:bg-white/[0.06]',
            ].join(' ')}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
