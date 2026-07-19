import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'rounded-input border-border bg-surface text-ink min-h-24 w-full border px-4 py-3 text-base',
        'transition-colors duration-150 outline-none',
        'hover:border-ink-tertiary focus:border-accent focus:ring-accent/20 focus:ring-2',
        'disabled:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-warning',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
