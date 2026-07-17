import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge por *tono*, no por estado de negocio: el mapeo
 * `estado de reserva → tono` vive en la capa de bookings, no en el primitivo.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-button px-3 py-1 text-sm font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-alt text-ink-secondary',
        accent: 'bg-accent-soft text-accent',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
