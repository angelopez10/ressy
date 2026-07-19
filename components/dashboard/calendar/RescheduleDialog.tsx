'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { rescheduleAsBusiness } from '@/lib/dashboard/actions';
import type { AgendaBundle, AgendaBookingDTO } from '@/lib/dashboard/types';
import { useIsMobile } from './useIsMobile';
import { SlotPicker } from './SlotPicker';
import { errorKey } from './errorKey';

/** Reagenda una reserva a un nuevo slot (mismo profesional), vía el motor. */
export function RescheduleDialog({
  booking,
  bundle,
  locale,
  onClose,
  onDone,
}: {
  booking: AgendaBookingDTO;
  bundle: AgendaBundle;
  locale: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('dashboard.calendar');
  const tErr = useTranslations('dashboard.calendar.errors');
  const isMobile = useIsMobile();
  const tz = bundle.business.timezone;

  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDate = DateTime.fromISO(booking.startsAtIso, { zone: 'utc' })
    .setZone(tz)
    .toISODate()!;

  async function submit() {
    if (!startsAt) return;
    setError(null);
    setLoading(true);
    const res = await rescheduleAsBusiness({
      bookingId: booking.id,
      startsAt,
      staffMemberId: booking.staffMemberId,
    });
    setLoading(false);
    if (res.ok) onDone();
    else setError(tErr(errorKey(res.reason)));
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={t('detail.reschedule')}>
      <ModalHeader title={t('detail.reschedule')} onClose={onClose} closeLabel={t('detail.close')} />
      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        <p className="text-ink-secondary text-sm">
          {booking.customerName} · {booking.serviceName}
        </p>
        <SlotPicker
          businessId={bundle.business.id}
          serviceId={booking.serviceId}
          staffMemberId={booking.staffMemberId}
          timezone={tz}
          locale={locale}
          initialDate={initialDate}
          value={startsAt}
          onChange={setStartsAt}
        />
        {error && <p className="text-warning text-sm">{error}</p>}
        <Button onClick={submit} loading={loading} disabled={!startsAt}>
          {t('detail.reschedule')}
        </Button>
      </div>
    </Modal>
  );
}
