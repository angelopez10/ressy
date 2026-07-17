import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        // Inputs: radio 12px, borde en reposo (CLAUDE.md §5).
        'rounded-input border-border bg-surface text-ink flex h-12 w-full border px-4 text-base',
        'transition-colors duration-150 outline-none',
        'hover:border-ink-tertiary',
        'focus:border-accent focus:ring-accent/20 focus:ring-2',
        'disabled:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-warning aria-[invalid=true]:focus:ring-warning/20',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
