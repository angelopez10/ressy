'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
}

/**
 * Tabs simples controladas (patrón del mockup de ajustes: subrayado en el
 * acento). El contenido lo controla el consumidor según `value`.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('border-border flex gap-6 overflow-x-auto border-b', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-1 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
              active
                ? 'border-accent text-ink'
                : 'text-ink-secondary hover:text-ink border-transparent',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
