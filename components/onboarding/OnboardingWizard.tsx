'use client';

import { useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  saveBasics,
  savePage,
  publishBusiness,
  saveSchedule,
  saveServices,
} from '@/lib/onboarding/actions';
import { startSubscriptionUpgrade } from '@/lib/dashboard/subscription.actions';
import type { OnboardingDraft, DraftDay } from '@/lib/onboarding/state';
import type { ServiceDraft } from '@/lib/onboarding/schema';
import type { BillingCycle, PlanId } from '@/lib/plans/config';
import { Button } from '@/components/ui/Button';
import { OnboardingStepper } from './OnboardingStepper';
import { Step1Business, type BasicsState } from './Step1Business';
import { Step2Services } from './Step2Services';
import { Step3Schedule } from './Step3Schedule';
import { Step4Page, type PageState } from './Step4Page';
import { Step5Plan } from './Step5Plan';
import { Step5Done } from './Step5Done';

interface Props {
  draft: OnboardingDraft;
  locale: 'es' | 'en';
}

/**
 * Orquestador del onboarding (6 pasos). El estado se hidrata del borrador que
 * carga el server (la DB es la persistencia real) y cada "Continuar" escribe ese
 * paso vía server action antes de avanzar. Refrescar retoma donde quedó. El paso
 * 5 (Plan) es informativo (trial de 14 días sin tarjeta); publicar es su acción.
 */
export function OnboardingWizard({ draft, locale }: Props) {
  const t = useTranslations('onboarding');
  const [step, setStep] = useState(draft.resumeStep);
  const [businessId, setBusinessId] = useState<string | null>(draft.businessId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [basics, setBasics] = useState<BasicsState>(
    draft.basics
      ? {
          name: draft.basics.name,
          ownerName: draft.basics.ownerName,
          category: (draft.basics.category ?? 'barbershop') as BasicsState['category'],
          country: 'CL',
          timezone: draft.basics.timezone,
          currency: draft.basics.currency,
        }
      : {
          name: '',
          ownerName: '',
          category: 'barbershop',
          country: 'CL',
          timezone: 'America/Santiago',
          currency: 'CLP',
        },
  );
  const [services, setServices] = useState<ServiceDraft[]>(
    draft.services.length > 0
      ? draft.services
      : [{ name: '', durationMin: 30, priceAmount: 0, bufferAfterMin: 0 }],
  );
  const [days, setDays] = useState<DraftDay[]>(draft.days);
  const [page, setPage] = useState<PageState>({
    slug: draft.page?.slug ?? '',
    accentColor: draft.page?.accentColor ?? '#348D83',
    bookingLocale: draft.page?.bookingLocale ?? locale,
    logoUrl: draft.page?.logoUrl ?? null,
  });
  // Plan sugerido por defecto = el popular. Free ⇒ trial; pago ⇒ checkout de MP.
  const [plan, setPlan] = useState<PlanId>('team');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  function persistAndAdvance() {
    setError(null);
    startTransition(async () => {
      if (step === 1) {
        const res = await saveBasics(basics);
        if (!res.ok) return setError(res.error);
        setBusinessId(res.data.businessId);
        setStep(2);
      } else if (step === 2 && businessId) {
        const res = await saveServices(businessId, { services });
        if (!res.ok) return setError(res.error);
        setStep(3);
      } else if (step === 3 && businessId) {
        const res = await saveSchedule(businessId, { days });
        if (!res.ok) return setError(res.error);
        setStep(4);
      } else if (step === 4 && businessId) {
        const res = await savePage(businessId, page);
        if (!res.ok) return setError(res.error);
        setPage((p) => ({ ...p, slug: res.data.slug }));
        setStep(5);
      } else if (step === 5 && businessId) {
        // Publica primero (la booking page queda viva en ambos casos).
        const res = await publishBusiness(businessId);
        if (!res.ok) return setError(res.error);
        setPage((p) => ({ ...p, slug: res.data.slug }));

        // Free ⇒ queda con el Team trial de 14 días (sin tarjeta) → Listo.
        // Pago ⇒ se suscribe en MP y vuelve; si el billing no está disponible
        // (no CLP / no configurado), no bloqueamos: cae al trial y sigue a Listo.
        if (plan === 'free') {
          setStep(6);
        } else {
          const sub = await startSubscriptionUpgrade(plan, cycle, locale, 'welcome');
          if (sub.ok) {
            window.location.href = sub.checkoutUrl;
          } else {
            setStep(6);
          }
        }
      }
    });
  }

  const nextLabel = step === 5 ? t('publish') : t('continue');

  return (
    <main className="bg-surface-alt flex min-h-screen flex-col items-center px-5 py-8 sm:py-12">
      <div className="w-full max-w-xl">
        <OnboardingStepper currentIndex={step - 1} />

        <div className="border-border bg-surface rounded-card mt-7 border p-6 sm:p-8">
          {step === 1 && (
            <Step1Business value={basics} onChange={setBasics} locale={locale} error={error} />
          )}
          {step === 2 && (
            <Step2Services
              value={services}
              onChange={setServices}
              currency={basics.currency}
              error={error}
            />
          )}
          {step === 3 && <Step3Schedule value={days} onChange={setDays} error={error} />}
          {step === 4 && businessId && (
            <Step4Page
              value={page}
              onChange={setPage}
              businessId={businessId}
              businessName={basics.name}
              locale={locale}
              error={error}
            />
          )}
          {step === 5 && (
            <Step5Plan
              value={plan}
              onChange={setPlan}
              cycle={cycle}
              onCycleChange={setCycle}
              currency={basics.currency}
            />
          )}
          {step === 6 && (
            <Step5Done
              slug={page.slug}
              accentColor={page.accentColor}
              locale={locale}
              businessId={businessId}
            />
          )}
        </div>

        {step < 6 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
                disabled={isPending}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t('back')}
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={persistAndAdvance} loading={isPending}>
              {nextLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
