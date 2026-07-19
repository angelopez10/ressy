'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Campo con label, hint opcional y mensaje de error. Usado por todos los pasos. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={cn(
          'text-small mb-1.5 block font-semibold',
          error ? 'text-warning' : 'text-ink-secondary',
        )}
      >
        {label}
      </span>
      {children}
      {hint && !error && <span className="text-ink-tertiary mt-1 block text-xs">{hint}</span>}
      {error && <span className="text-warning mt-1 block text-xs">{error}</span>}
    </label>
  );
}

/** Select con el look de los inputs Ressy (radio 12px, borde, focus en acento). */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'rounded-input border-border bg-surface text-ink h-12 w-full border px-3 text-base',
        'transition-colors outline-none',
        'hover:border-ink-tertiary focus:border-accent focus:ring-accent/20 focus:ring-2',
        className,
      )}
      {...props}
    />
  );
}
