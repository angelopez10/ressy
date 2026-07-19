'use client';

import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Scissors,
  UserRound,
  UserX,
  XCircle,
} from 'lucide-react';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/db/mappers';
import { applyBusinessTransition, fetchCustomerHistory } from '@/lib/dashboard/actions';
import type { AgendaBundle, AgendaBookingDTO, CustomerHistoryDTO } from '@/lib/dashboard/types';
import { useIsMobile } from './useIsMobile';
import { statusStyle } from './status';
import { ConfirmDialog } from './ConfirmDialog';

const LIVE = new Set(['pending_payment', 'confirmed', 'rescheduled']);

/**
 * Detalle de una reserva: panel lateral en desktop, bottom-sheet en móvil.
 * Muestra cliente, servicio, horario y el mini-historial del cliente (mini-CRM),
 * y ofrece las transiciones del negocio. Toda transición pasa por la función
 * central `booking_apply_business_transition` (vía server action).
 */
export function BookingDetailPanel({
  booking,
  bundle,
  locale,
  onClose,
  onReschedule,
  onChanged,
}: {
  booking: AgendaBookingDTO;
  bundle: AgendaBundle;
  locale: string;
  onClose: () => void;
  onReschedule: (booking: AgendaBookingDTO) => void;
  onChanged: () => void;
}) {
  const t = useTranslations('dashboard.calendar');
  const tErr = useTranslations('dashboard.calendar.errors');
  const isMobile = useIsMobile();
  const tz = bundle.business.timezone;

  const [history, setHistory] = useState<CustomerHistoryDTO | null>(null);
  const [pending, setPending] = useState<null | 'completed' | 'no_show' | 'cancelled_by_business'>(
    null,
  );
  const [confirm, setConfirm] = useState<null | 'no_show' | 'cancelled_by_business'>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setHistory(null);
    fetchCustomerHistory(booking.customerId, booking.currency).then((h) => {
      if (active) setHistory(h);
    });
    return () => {
      active = false;
    };
  }, [booking.customerId, booking.currency]);

  const style = statusStyle(booking.status);
  const start = DateTime.fromISO(booking.startsAtIso, { zone: 'utc' }).setZone(tz).setLocale(locale);
  const end = DateTime.fromISO(booking.endsAtIso, { zone: 'utc' }).setZone(tz).setLocale(locale);
  const staffName = bundle.staff.find((s) => s.id === booking.staffMemberId)?.name ?? '—';
  const isLive = LIVE.has(booking.status);
  const canComplete = booking.status === 'confirmed' || booking.status === 'rescheduled';

  async function transition(target: 'completed' | 'no_show' | 'cancelled_by_business', reason?: string) {
    setError(null);
    setPending(target);
    const res = await applyBusinessTransition({ bookingId: booking.id, target, reason });
    setPending(null);
    setConfirm(null);
    if (res.ok) {
      onChanged();
    } else {
      setError(tErr(errKey(res.reason)));
    }
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        side={isMobile ? 'bottom' : 'right'}
        label={booking.customerName}
      >
        <ModalHeader
          title={booking.customerName}
          onClose={onClose}
          closeLabel={t('detail.close')}
        />
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {/* estado + contacto */}
          <div className="flex items-center gap-3">
            <span
              className="flex size-12 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: 'var(--color-surface-alt)', color: 'var(--color-ink-secondary)' }}
              aria-hidden="true"
            >
              {booking.customerName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={`${style.bg} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold`}
                style={{ color: style.bar }}
              >
                <span className="size-1.5 rounded-full" style={{ background: style.bar }} />
                {t(`status.${booking.status}`)}
              </span>
              <p className="text-ink-secondary mt-1 truncate text-sm">
                {booking.customerPhone ?? booking.customerEmail ?? t('detail.noContact')}
              </p>
            </div>
          </div>

          {/* filas de info */}
          <div className="border-border rounded-card divide-border divide-y border">
            <DetailRow icon={<Scissors />} label={t('detail.service')} value={booking.serviceName} />
            <DetailRow
              icon={<Clock />}
              label={t('detail.time')}
              value={`${start.toFormat('HH:mm')}–${end.toFormat('HH:mm')} · ${t('detail.duration', { count: booking.durationMin })}`}
            />
            <DetailRow
              icon={<CalendarDays />}
              label={t('detail.date')}
              value={start.toFormat("cccc d 'de' LLLL")}
            />
            <DetailRow icon={<UserRound />} label={t('detail.professional')} value={staffName} />
          </div>

          {booking.note && (
            <div className="bg-surface-alt rounded-card p-3.5">
              <p className="text-ink-tertiary text-xs font-semibold tracking-wide uppercase">
                {t('detail.note')}
              </p>
              <p className="text-ink mt-1 text-sm">{booking.note}</p>
            </div>
          )}

          {/* mini-historial */}
          <div>
            <p className="text-ink-tertiary mb-2.5 text-xs font-semibold tracking-wide uppercase">
              {t('detail.history')}
            </p>
            {history ? (
              <div className="flex gap-6">
                <HistoryStat value={String(history.visits)} label={t('detail.visits')} />
                <HistoryStat
                  value={String(history.noShows)}
                  label={t('detail.noShows')}
                  warn={history.noShows > 0}
                />
                <HistoryStat
                  value={formatMoney(history.totalSpent, history.currency, locale)}
                  label={t('detail.spent')}
                />
              </div>
            ) : (
              <div className="bg-surface-alt h-10 w-48 animate-pulse rounded" />
            )}
          </div>

          {error && <p className="text-warning text-sm">{error}</p>}

          {/* acciones */}
          {isLive && (
            <div className="grid grid-cols-2 gap-2.5">
              {canComplete && (
                <Button
                  onClick={() => transition('completed')}
                  loading={pending === 'completed'}
                  disabled={pending !== null}
                >
                  <Check aria-hidden="true" />
                  {t('detail.complete')}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => onReschedule(booking)}
                disabled={pending !== null}
              >
                <CalendarClock aria-hidden="true" />
                {t('detail.reschedule')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirm('no_show')}
                disabled={pending !== null}
              >
                <UserX aria-hidden="true" />
                {t('detail.noShow')}
              </Button>
              <Button
                variant="secondary"
                className="text-warning"
                onClick={() => setConfirm('cancelled_by_business')}
                disabled={pending !== null}
              >
                <XCircle aria-hidden="true" />
                {t('detail.cancel')}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm === 'no_show'}
        title={t('confirm.noShowTitle')}
        body={t('confirm.noShowBody')}
        loading={pending === 'no_show'}
        onConfirm={() => transition('no_show')}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'cancelled_by_business'}
        title={t('confirm.cancelTitle')}
        body={t('confirm.cancelBody')}
        withReason
        loading={pending === 'cancelled_by_business'}
        onConfirm={(reason) => transition('cancelled_by_business', reason)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className="text-ink-secondary [&_svg]:size-[17px]" aria-hidden="true">
        {icon}
      </span>
      <span className="text-ink-secondary flex-1 text-sm">{label}</span>
      <span className="text-ink text-right text-sm font-semibold capitalize">{value}</span>
    </div>
  );
}

function HistoryStat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-bold ${warn ? 'text-warning' : 'text-ink'}`}>{value}</div>
      <div className="text-ink-secondary text-xs">{label}</div>
    </div>
  );
}

function errKey(reason: string): string {
  switch (reason) {
    case 'slot_taken':
      return 'slotTaken';
    case 'slot_unavailable':
      return 'slotUnavailable';
    case 'not_authorized':
      return 'notAuthorized';
    default:
      return 'generic';
  }
}
