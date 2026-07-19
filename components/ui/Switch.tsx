'use client';

import { cn } from '@/lib/utils';

/**
 * Toggle accesible (role=switch). Controlado. El verde de `success` marca "on"
 * como en el mockup de ajustes.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors',
        'focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        checked ? 'border-success bg-success/15' : 'border-border bg-surface-alt',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'absolute size-4 rounded-full transition-all',
          checked ? 'left-[22px] bg-success' : 'left-0.5 bg-ink-tertiary',
        )}
      />
    </button>
  );
}
