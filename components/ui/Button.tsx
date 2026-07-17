import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Botones: 16px / 600, radio pill (CLAUDE.md §5).
  'inline-flex items-center justify-center gap-2 rounded-button text-base font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-foreground hover:bg-accent-hover',
        secondary: 'border border-ink bg-surface text-ink hover:bg-surface-alt',
        ghost: 'bg-transparent text-ink hover:bg-surface-alt',
        destructive: 'bg-warning text-white hover:opacity-90',
      },
      size: {
        sm: 'h-10 px-4 text-sm',
        md: 'h-12 px-6',
        lg: 'h-14 px-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Muestra un spinner y bloquea el botón. El label se mantiene para no saltar de ancho. */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  // `Slot` solo admite un hijo, así que el spinner nunca se compone con asChild.
  const showSpinner = loading && !asChild;

  if (asChild) {
    return (
      <Slot className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {showSpinner ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
