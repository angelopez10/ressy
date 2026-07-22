'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import type { Enums } from '@/lib/db/types';

const TONE: Record<Enums<'booking_status'>, 'neutral' | 'accent' | 'success' | 'warning'> = {
  pending_payment: 'accent',
  confirmed: 'success',
  rescheduled: 'accent',
  completed: 'neutral',
  cancelled_by_client: 'warning',
  cancelled_by_business: 'warning',
  no_show: 'warning',
  payment_expired: 'neutral',
};

/** Estado de reserva → Badge por tono (mapeo en la capa de bookings, no en el primitivo). */
export function BookingStatusBadge({ status }: { status: Enums<'booking_status'> }) {
  const t = useTranslations('dashboard.calendar.status');
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
