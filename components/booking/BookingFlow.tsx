'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBooking } from '@/lib/booking/actions';
import type {
  BookingBundle,
  BookingFailure,
  CreateBookingResult,
  SlotDTO,
} from '@/lib/booking/types';
import { cn } from '@/lib/utils';
import { BookingAside } from './BookingAside';
import { BookingStepper } from './BookingStepper';
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { DateTimeStep } from './DateTimeStep';
import { DetailsStep } from './DetailsStep';
import { ConfirmationStep } from './ConfirmationStep';

type StepId = 'service' | 'staff' | 'datetime' | 'details' | 'confirm';
const ORDER: StepId[] = ['service', 'staff', 'datetime', 'details', 'confirm'];

interface Props {
  bundle: BookingBundle;
  locale: 'es' | 'en';
  source: 'link' | 'qr' | 'instagram' | 'manual' | 'other';
}

/**
 * Orquestador del flujo de reserva (5 pasos del mockup). Guarda el estado del
 * wizard en el cliente; los datos del negocio llegan del server component y los
 * slots se piden a demanda vía server action.
 *
 * La carrera de doble-booking es de primera clase: si `createBooking` devuelve
 * `slot_taken`/`slot_unavailable`, volvemos al paso de fecha/hora con un aviso
 * para reofrecer horarios (el motor recalcula al recargar la semana).
 */
export function BookingFlow({ bundle, locale, source }: Props) {
  const t = useTranslations('booking');
  const [step, setStep] = useState<StepId>('service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffMemberId, setStaffMemberId] = useState<string | null | undefined>(undefined);
  const [slot, setSlot] = useState<SlotDTO | null>(null);
  const [result, setResult] = useState<{ token: string; status: string } | null>(null);
  const [conflict, setConflict] = useState<BookingFailure | null>(null);
  const [isPending, startTransition] = useTransition();

  const service = useMemo(
    () => bundle.services.find((s) => s.id === serviceId) ?? null,
    [bundle.services, serviceId],
  );

  const capableStaff = useMemo(() => {
    if (!serviceId) return [];
    const ids = new Set(bundle.serviceStaff[serviceId] ?? []);
    return bundle.staff.filter((s) => ids.has(s.id));
  }, [bundle.serviceStaff, bundle.staff, serviceId]);

  const selectedStaff = useMemo(
    () => (staffMemberId ? (bundle.staff.find((s) => s.id === staffMemberId) ?? null) : null),
    [bundle.staff, staffMemberId],
  );

  const goStep = useCallback((next: StepId) => {
    setConflict(null);
    setStep(next);
  }, []);

  const onSelectService = useCallback(
    (id: string) => {
      setServiceId(id);
      setStaffMemberId(undefined);
      setSlot(null);
      goStep('staff');
    },
    [goStep],
  );

  const onSelectStaff = useCallback(
    (id: string | null) => {
      setStaffMemberId(id);
      setSlot(null);
      goStep('datetime');
    },
    [goStep],
  );

  const onPickSlot = useCallback(
    (picked: SlotDTO) => {
      setSlot(picked);
      goStep('details');
    },
    [goStep],
  );

  const onConfirm = useCallback(
    (guest: { fullName: string; email?: string; phone?: string; note?: string }) => {
      if (!service || !slot) return;
      startTransition(async () => {
        const res: CreateBookingResult = await createBooking({
          businessId: bundle.business.id,
          serviceId: service.id,
          staffMemberId: staffMemberId ?? null,
          startsAt: slot.startsAtIso,
          guest,
          locale,
          source,
        });
        if (res.ok) {
          // Anticipo: MP nos devolvió la URL del checkout hospedado. Redirigimos;
          // la confirmación real llega por webhook (no por el retorno).
          if (res.status === 'pending_payment' && res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
            return;
          }
          setResult({ token: res.token, status: res.status });
          setStep('confirm');
        } else if (res.reason === 'slot_taken' || res.reason === 'slot_unavailable') {
          // Perdió la carrera: de vuelta a elegir hora con el aviso.
          setConflict(res.reason);
          setSlot(null);
          setStep('datetime');
        } else {
          setConflict(res.reason);
        }
      });
    },
    [bundle.business.id, locale, service, slot, source, staffMemberId],
  );

  const stepIndex = ORDER.indexOf(step);
  const canGoBack = step !== 'service' && step !== 'confirm';

  const back = useCallback(() => {
    if (step === 'staff') goStep('service');
    else if (step === 'datetime') goStep('staff');
    else if (step === 'details') goStep('datetime');
  }, [goStep, step]);

  // Navegación por el stepper de desktop: solo a pasos ya completados.
  const goToIndex = useCallback(
    (i: number) => {
      const target = ORDER[i];
      if (target && i < stepIndex) goStep(target);
    },
    [goStep, stepIndex],
  );

  return (
    <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-8 lg:py-8">
      {/* Rail lateral (desktop): perfil + "Tu reserva". */}
      <BookingAside
        business={bundle.business}
        policies={bundle.policies}
        service={service}
        staff={selectedStaff}
        anyStaff={staffMemberId === null}
        slot={slot}
        locale={locale}
      />

      <div className="min-w-0">
        {/* Stepper numerado (desktop). */}
        <div className="mb-6 hidden lg:block">
          <BookingStepper currentIndex={stepIndex} onGoto={goToIndex} />
        </div>

        {/* Card principal con los pasos. */}
        <div className="bg-surface sm:rounded-card sm:border-border flex min-h-full flex-col overflow-hidden sm:border">
          {/* Barra de progreso + back: solo móvil (desktop usa el stepper de arriba). */}
          {step !== 'confirm' && (
            <div className="flex items-center gap-3 px-5 pt-4 pb-2 lg:hidden">
              <button
                type="button"
                onClick={back}
                aria-label={t('back')}
                className={cn(
                  'text-ink flex size-8 items-center justify-center rounded-full transition-colors',
                  canGoBack ? 'hover:bg-surface-alt' : 'pointer-events-none opacity-0',
                )}
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <ol className="flex flex-1 gap-1.5" aria-label={`${stepIndex + 1}/${ORDER.length}`}>
                {ORDER.map((s, i) => (
                  <li
                    key={s}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      i <= stepIndex ? 'bg-ink' : 'bg-border',
                    )}
                  />
                ))}
              </ol>
            </div>
          )}

          {step === 'service' && (
            <ServiceStep bundle={bundle} locale={locale} onSelect={onSelectService} />
          )}

          {step === 'staff' && service && (
            <StaffStep service={service} staff={capableStaff} onSelect={onSelectStaff} />
          )}

          {step === 'datetime' && service && (
            <DateTimeStep
              business={bundle.business}
              policies={bundle.policies}
              service={service}
              staffMemberId={staffMemberId ?? null}
              locale={locale}
              conflict={conflict}
              onPick={onPickSlot}
            />
          )}

          {step === 'details' && service && slot && (
            <DetailsStep
              business={bundle.business}
              policies={bundle.policies}
              service={service}
              slot={slot}
              staff={selectedStaff}
              locale={locale}
              submitting={isPending}
              error={conflict}
              onConfirm={onConfirm}
            />
          )}

          {step === 'confirm' && service && slot && result && (
            <ConfirmationStep
              business={bundle.business}
              service={service}
              slot={slot}
              staff={selectedStaff}
              locale={locale}
              token={result.token}
              status={result.status}
            />
          )}
        </div>
      </div>
    </div>
  );
}
