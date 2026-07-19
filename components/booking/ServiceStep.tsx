'use client';

import { useState } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/booking/format';
import type { BookingBundle } from '@/lib/booking/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { BusinessHeader } from './BusinessHeader';

interface Props {
  bundle: BookingBundle;
  locale: 'es' | 'en';
  onSelect: (serviceId: string) => void;
}

/**
 * Paso 1: perfil (solo móvil; en desktop va en el rail) + elegir servicio.
 *   - Móvil: lista con botón "Reservar" por fila que avanza directo.
 *   - Desktop: grilla de 2 columnas seleccionable + "Continuar" (mockup).
 */
export function ServiceStep({ bundle, locale, onSelect }: Props) {
  const t = useTranslations('booking.profile');
  const { business, services } = bundle;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      {/* Portada — solo móvil; en desktop la muestra el rail lateral. */}
      <BusinessHeader business={business} className="lg:hidden" />

      <div className="px-5 pt-4 pb-8 lg:pt-6">
        <h2 className="text-ink text-h3">{t('chooseService')}</h2>
        <p className="text-ink-secondary text-small mt-1 mb-5 hidden lg:block">{t('subtitle')}</p>

        {services.length === 0 ? (
          <p className="text-ink-secondary border-border rounded-card text-small mt-3 border border-dashed p-6 text-center">
            {t('noServices')}
          </p>
        ) : (
          <>
            {/* MÓVIL: lista con "Reservar" por fila. */}
            <ul className="flex flex-col gap-2.5 lg:hidden">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="border-border rounded-card flex items-center gap-3.5 border p-4"
                >
                  <div className="flex-1">
                    <p className="text-ink font-semibold">{s.name}</p>
                    <p className="text-ink-secondary text-small mt-0.5 flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden="true" />
                      {t('minutes', { count: s.durationMin })}
                      <span aria-hidden="true">·</span>
                      <span className="text-ink font-semibold">
                        {formatMoney(s.priceAmount, business.currency, locale)}
                      </span>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => onSelect(s.id)}>
                    {t('book')}
                  </Button>
                </li>
              ))}
            </ul>

            {/* DESKTOP: grilla seleccionable de 2 columnas + "Continuar". */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-3">
                {services.map((s) => {
                  const selected = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-card border p-5 text-left transition-colors',
                        selected ? 'border-ink' : 'border-border hover:border-ink-tertiary',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-ink font-semibold">{s.name}</p>
                          <p className="text-ink-secondary text-small mt-1 flex items-center gap-1.5">
                            <Clock className="size-3.5" aria-hidden="true" />
                            {t('minutes', { count: s.durationMin })}
                          </p>
                        </div>
                        <span className="text-ink text-lg font-bold whitespace-nowrap">
                          {formatMoney(s.priceAmount, business.currency, locale)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button disabled={!selectedId} onClick={() => selectedId && onSelect(selectedId)}>
                  {t('continue')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
