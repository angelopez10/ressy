'use client';

import { useState, useTransition } from 'react';
import { CalendarClock, CheckCircle2, Clock, Scissors, User, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cancelBooking, rescheduleBooking } from '@/lib/booking/actions';
import { formatLongDate, formatSlotTime } from '@/lib/booking/format';
import type {
  BookingBusinessDTO,
  BookingServiceDTO,
  BookingFailure,
  PublicBookingView,
  SlotDTO,
} from '@/lib/booking/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DateTimeStep } from './DateTimeStep';

interface Props {
  view: PublicBookingView;
  token: string;
  locale: 'es' | 'en';
}

type Mode = 'view' | 'reschedule' | 'confirmCancel' | 'cancelled' | 'rescheduled';

const LIVE_STATUSES = new Set(['confirmed', 'pending_payment', 'rescheduled']);

/**
 * Pantalla de gestión sin login (por token): reagendar o cancelar, respetando la
 * ventana de cancelación del negocio. Las transiciones pasan por las RPCs
 * centrales (migración 07); nunca se muta el estado a mano.
 */
export function ManageBooking({ view, token, locale }: Props) {
  const t = useTranslations('booking.manage');
  const errT = useTranslations('booking.errors');
  const [mode, setMode] = useState<Mode>('view');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<BookingFailure | null>(null);
  const [movedTo, setMovedTo] = useState<SlotDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const tz = view.timezone;
  const start = new Date(view.startsAtIso);
  const canManage = LIVE_STATUSES.has(view.status);

  const business: BookingBusinessDTO = {
    id: view.businessId,
    slug: view.businessSlug,
    name: view.businessName,
    category: null,
    timezone: view.timezone,
    currency: view.currency,
    accentColor: null,
    logoUrl: null,
    hoursSummary: null,
  };
  const service: BookingServiceDTO = {
    id: view.serviceId,
    name: view.serviceName,
    description: null,
    durationMin: view.serviceDurationMin,
    priceAmount: view.priceAmount,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
  };

  function onCancel() {
    startTransition(async () => {
      const res = await cancelBooking({ token, reason });
      if (res.ok) setMode('cancelled');
      else setError(res.reason);
    });
  }

  function onReschedule(slot: SlotDTO) {
    startTransition(async () => {
      const res = await rescheduleBooking({
        token,
        startsAt: slot.startsAtIso,
        staffMemberId: view.staffMemberId,
      });
      if (res.ok) {
        setMovedTo(slot);
        setMode('rescheduled');
      } else {
        setError(res.reason);
        // slot_taken se muestra dentro del picker vía la prop `conflict`.
      }
    });
  }

  // Resultado terminal: cancelada o reagendada con éxito.
  if (mode === 'cancelled') {
    return (
      <Result
        tone="cancelled"
        title={t('cancelledOk')}
        detail={`${view.serviceName} · ${formatLongDate(start, tz, locale)}`}
      />
    );
  }
  if (mode === 'rescheduled' && movedTo) {
    return (
      <Result
        tone="ok"
        title={t('rescheduledOk')}
        detail={`${view.serviceName} · ${formatLongDate(new Date(movedTo.startsAtIso), tz, locale)} · ${formatSlotTime(new Date(movedTo.startsAtIso), tz, locale)}`}
      />
    );
  }

  if (mode === 'reschedule') {
    return (
      <div>
        <div className="px-5 pt-4">
          <h1 className="text-ink text-h3">{t('rescheduleTitle')}</h1>
        </div>
        <DateTimeStep
          business={business}
          policies={{
            depositType: 'none',
            depositPercent: null,
            depositAmount: null,
            cancellationWindowHours: view.cancellationWindowHours ?? 24,
            minLeadTimeMin: 0,
            maxAdvanceDays: 365,
          }}
          service={service}
          staffMemberId={view.staffMemberId}
          locale={locale}
          conflict={error === 'slot_taken' || error === 'slot_unavailable' ? error : null}
          onPick={onReschedule}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col px-5 pt-5 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-ink text-h3">{t('title')}</h1>
        <Badge tone={canManage ? 'success' : 'neutral'}>{t(`status.${view.status}`)}</Badge>
      </div>

      <div className="border-border rounded-card border p-4">
        <p className="text-ink font-bold">{view.businessName}</p>
        <div className="mt-3 flex flex-col gap-3">
          <Row icon={<Scissors className="size-4" />}>
            {view.serviceName} · {view.serviceDurationMin} min
          </Row>
          <Row icon={<User className="size-4" />}>{view.staffName}</Row>
          <Row icon={<Clock className="size-4" />}>
            {formatLongDate(start, tz, locale)} · {formatSlotTime(start, tz, locale)}
          </Row>
        </div>
      </div>

      {mode === 'confirmCancel' ? (
        <div className="mt-5">
          <p className="text-ink font-semibold">{t('confirmCancelTitle')}</p>
          <p className="text-ink-secondary text-small mt-1">{t('confirmCancelBody')}</p>
          <textarea
            rows={2}
            value={reason}
            placeholder={t('cancelReason')}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-input border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 mt-3 w-full resize-none border px-4 py-3 text-base outline-none focus:ring-2"
          />
          {error === 'outside_window' && (
            <p
              role="alert"
              className="bg-warning-soft text-warning rounded-input text-small mt-3 px-4 py-3"
            >
              {t('outsideWindow', { hours: view.cancellationWindowHours ?? 24 })}
            </p>
          )}
          {error && error !== 'outside_window' && (
            <p role="alert" className="text-warning text-small mt-3">
              {errT('generic')}
            </p>
          )}
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" className="flex-1" onClick={() => setMode('view')}>
              {t('keep')}
            </Button>
            <Button variant="destructive" className="flex-1" loading={isPending} onClick={onCancel}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        canManage && (
          <div className="mt-5 flex flex-col gap-2.5">
            <Button onClick={() => setMode('reschedule')}>
              <CalendarClock className="size-4" aria-hidden="true" />
              {t('reschedule')}
            </Button>
            <Button
              variant="ghost"
              className="text-warning"
              onClick={() => {
                setError(null);
                setMode('confirmCancel');
              }}
            >
              {t('cancel')}
            </Button>
          </div>
        )
      )}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="text-ink text-small flex items-center gap-3">
      <span className="text-ink-secondary flex size-7 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Result({
  tone,
  title,
  detail,
}: {
  tone: 'ok' | 'cancelled';
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <span
        className={
          tone === 'ok'
            ? 'bg-success-soft text-success flex size-16 items-center justify-center rounded-full'
            : 'bg-surface-alt text-ink-secondary flex size-16 items-center justify-center rounded-full'
        }
      >
        {tone === 'ok' ? (
          <CheckCircle2 className="size-8" aria-hidden="true" />
        ) : (
          <XCircle className="size-8" aria-hidden="true" />
        )}
      </span>
      <h1 className="text-ink text-h3">{title}</h1>
      <p className="text-ink-secondary text-small">{detail}</p>
    </div>
  );
}
