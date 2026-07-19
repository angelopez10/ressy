'use client';

import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createManualBooking } from '@/lib/dashboard/actions';
import type { AgendaBundle } from '@/lib/dashboard/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from './useIsMobile';
import { SlotPicker } from './SlotPicker';
import { errorKey } from './errorKey';

const selectClass =
  'rounded-input border-border bg-surface text-ink h-12 w-full border px-4 text-base outline-none focus:border-accent focus:ring-accent/20 focus:ring-2';

/**
 * Reserva manual (walk-in / teléfono). Servicio → profesional → fecha/hora
 * (vía el motor, así que no ofrece slots ocupados) → cliente. El cliente se
 * upserta por email/teléfono en la RPC: si ya existe, se reutiliza; si no, se
 * crea. La carrera de doble-booking vuelve como `slot_taken` y se muestra.
 */
export function ManualBookingDialog({
  bundle,
  locale,
  onClose,
  onDone,
}: {
  bundle: AgendaBundle;
  locale: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('dashboard.calendar.manual');
  const tErr = useTranslations('dashboard.calendar.errors');
  const isMobile = useIsMobile();
  const tz = bundle.business.timezone;

  const [serviceId, setServiceId] = useState(bundle.services[0]?.id ?? '');
  const eligibleStaff = useMemo(() => {
    const ids = bundle.serviceStaff[serviceId] ?? bundle.staff.map((s) => s.id);
    return bundle.staff.filter((s) => ids.includes(s.id));
  }, [serviceId, bundle.serviceStaff, bundle.staff]);

  const [staffId, setStaffId] = useState(eligibleStaff[0]?.id ?? '');
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el servicio cambia y el staff elegido ya no lo hace, cae al primero.
  const staffValid = eligibleStaff.some((s) => s.id === staffId);
  const effectiveStaff = staffValid ? staffId : (eligibleStaff[0]?.id ?? '');

  const initialDate = DateTime.fromISO(bundle.anchorDate, { zone: tz }).toISODate()!;
  const canSubmit =
    Boolean(serviceId && effectiveStaff && startsAt && name.trim()) &&
    (Boolean(email.trim()) || Boolean(phone.trim()));

  async function submit() {
    if (!startsAt) return;
    setError(null);
    setLoading(true);
    const res = await createManualBooking({
      businessId: bundle.business.id,
      serviceId,
      staffMemberId: effectiveStaff,
      startsAt,
      customerName: name.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.trim(),
      note: note.trim(),
    });
    setLoading(false);
    if (res.ok) onDone();
    else setError(tErr(errorKey(res.reason)));
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={t('title')}>
      <ModalHeader title={t('title')} onClose={onClose} closeLabel="×" />
      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        <p className="text-ink-secondary text-sm">{t('subtitle')}</p>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-sm font-semibold">{t('stepService')}</span>
          <select
            className={selectClass}
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setStartsAt(null);
            }}
          >
            {bundle.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMin} min
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-sm font-semibold">{t('stepStaff')}</span>
          <select
            className={selectClass}
            value={effectiveStaff}
            onChange={(e) => {
              setStaffId(e.target.value);
              setStartsAt(null);
            }}
          >
            {eligibleStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {serviceId && effectiveStaff && (
          <SlotPicker
            businessId={bundle.business.id}
            serviceId={serviceId}
            staffMemberId={effectiveStaff}
            timezone={tz}
            locale={locale}
            initialDate={initialDate}
            value={startsAt}
            onChange={setStartsAt}
          />
        )}

        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <span className="text-ink text-sm font-semibold">{t('stepCustomer')}</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            aria-label={t('name')}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              aria-label={t('email')}
            />
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phone')}
              aria-label={t('phone')}
            />
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            aria-label={t('note')}
          />
        </div>

        {error && <p className="text-warning text-sm">{error}</p>}

        <Button
          onClick={submit}
          loading={loading}
          disabled={!canSubmit}
          className={cn(!canSubmit && 'opacity-60')}
        >
          {loading ? t('creating') : t('create')}
        </Button>
      </div>
    </Modal>
  );
}
