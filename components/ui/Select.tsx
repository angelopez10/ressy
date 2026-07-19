import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Select nativo con el look Ressy (radio 12px, borde en reposo). */
function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'rounded-input border-border bg-surface text-ink h-12 w-full appearance-none border px-4 pr-10 text-base',
          'transition-colors duration-150 outline-none',
          'hover:border-ink-tertiary focus:border-accent focus:ring-accent/20 focus:ring-2',
          'disabled:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-ink-tertiary pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
}

export { Select };
