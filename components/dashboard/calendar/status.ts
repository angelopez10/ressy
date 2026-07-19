import type { Enums } from '@/lib/db/types';

/**
 * Tratamiento visual de un bloque según el estado de la reserva (mockup
 * RessyDashboard). Colores suaves de la paleta Airbnb clean: fondo en el tono
 * soft, barra izquierda en el color pleno. Completadas/canceladas/no-show van
 * apagadas; canceladas y no-show además tachadas.
 *
 * `bar` es una CSS var (se aplica como border-left-color inline); `bg` es una
 * utilidad Tailwind sobre los tokens.
 */
export interface StatusStyle {
  bg: string;
  bar: string;
  muted: boolean;
  strike: boolean;
}

export function statusStyle(status: Enums<'booking_status'>): StatusStyle {
  switch (status) {
    case 'confirmed':
      return { bg: 'bg-success-soft', bar: 'var(--color-success)', muted: false, strike: false };
    case 'pending_payment':
    case 'rescheduled':
      return { bg: 'bg-accent-soft', bar: 'var(--color-accent)', muted: false, strike: false };
    case 'completed':
      return { bg: 'bg-surface-alt', bar: 'var(--color-ink-tertiary)', muted: true, strike: false };
    case 'cancelled_by_client':
    case 'cancelled_by_business':
      return { bg: 'bg-warning-soft', bar: 'var(--color-warning)', muted: true, strike: true };
    case 'no_show':
      return { bg: 'bg-surface-alt', bar: 'var(--color-ink-secondary)', muted: true, strike: true };
  }
}
