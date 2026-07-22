'use client';

import { useEffect, useRef } from 'react';
import { reconcileSubscription } from '@/lib/dashboard/subscription.actions';
import { Step5Done } from './Step5Done';

/**
 * Pantalla de celebración post-checkout del onboarding: el negocio eligió un plan
 * pago, pasó por el checkout de MP y volvió acá. Reconciliamos la suscripción
 * (aplica el plan sin depender del webhook, poco fiable en sandbox) y mostramos la
 * misma celebración que el paso "Listo" (QR + compartir).
 */
export function WelcomeView({
  slug,
  accentColor,
  locale,
}: {
  slug: string;
  accentColor: string;
  locale: 'es' | 'en';
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Fire-and-forget: la celebración no depende del resultado; el plan se refleja
    // en el dashboard. Reintentos posteriores (o el webhook) cubren el resto.
    void reconcileSubscription();
  }, []);

  return <Step5Done slug={slug} accentColor={accentColor} locale={locale} />;
}
