'use client';

import { useState } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { blockTime } from '@/lib/dashboard/actions';
import type { AgendaBundle } from '@/lib/dashboard/types';
import { useIsMobile } from './useIsMobile';
import { errorKey } from './errorKey';

const selectClass =
  'rounded-input border-border bg-surface text-ink h-12 w-full border px-4 text-base outline-none focus:border-accent focus:ring-accent/20 focus:ring-2';
const BUSINESS = '__business__';

/**
 * Bloquea un tramo (almuerzo, ausencia, día libre). Se traduce a un
 * schedule_override 'unavailable', que el motor resta de inmediato: la booking
 * page deja de ofrecer esas horas apenas se crea.
 */
export function BlockTimeDialog({
  bundle,
  onClose,
  onDone,
}: {
  bundle: AgendaBundle;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('dashboard.calendar.block');
  const tErr = useTranslations('dashboard.calendar.errors');
  const isMobile = useIsMobile();
  const tz = bundle.business.timezone;

  const [scope, setScope] = useState<string>(bundle.staff[0]?.id ?? BUSINESS);
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState(
    DateTime.fromISO(bundle.anchorDate, { zone: tz }).toISODate()!,
  );
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('14:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const day = DateTime.fromISO(date, { zone: tz }).startOf('day');
    if (!day.isValid) {
      setError(tErr('invalidRange'));
      return;
    }
    let start: DateTime;
    let end: DateTime;
    if (allDay) {
      start = day;
      end = day.plus({ days: 1 });
    } else {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      start = day.set({ hour: sh, minute: sm });
      end = day.set({ hour: eh, minute: em });
    }
    if (end <= start) {
      setError(tErr('invalidRange'));
      return;
    }

    setLoading(true);
    const res = await blockTime({
      businessId: bundle.business.id,
      staffMemberId: scope === BUSINESS ? null : scope,
      startsAt: start.toUTC().toISO()!,
      endsAt: end.toUTC().toISO()!,
      reason: reason.trim() || undefined,
    });
    setLoading(false);
    if (res.ok) onDone();
    else setError(tErr(errorKey(res.reason)));
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={t('title')} className="max-w-md">
      <ModalHeader title={t('title')} onClose={onClose} closeLabel="×" />
      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        <p className="text-ink-secondary text-sm">{t('subtitle')}</p>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-sm font-semibold">{t('scope')}</span>
          <select className={selectClass} value={scope} onChange={(e) => setScope(e.target.value)}>
            {bundle.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value={BUSINESS}>{t('wholeBusiness')}</option>
          </select>
        </label>

        <label className="border-border flex items-center justify-between rounded-input border px-4 py-3">
          <span className="text-ink text-sm font-medium">{t('allDay')}</span>
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="accent-accent size-5"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-sm font-semibold">{t('date')}</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-ink-secondary text-sm font-semibold">{t('startTime')}</span>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-ink-secondary text-sm font-semibold">{t('endTime')}</span>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-sm font-semibold">{t('reason')}</span>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonPlaceholder')}
          />
        </label>

        {error && <p className="text-warning text-sm">{error}</p>}

        <Button onClick={submit} loading={loading}>
          {loading ? t('creating') : t('create')}
        </Button>
      </div>
    </Modal>
  );
}
