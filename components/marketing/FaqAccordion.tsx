'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';

type FaqItem = { q: string; a: string };

/**
 * Acordeón de FAQ, una pregunta abierta a la vez (mockup RessyLanding).
 * Sin dependencias nuevas: `button` + `aria-expanded` + una región colapsable.
 * El contenido se renderiza siempre en el HTML (SSR) por SEO; solo se oculta con CSS.
 */
export function FaqAccordion() {
  const t = useTranslations('marketing.faq');
  const items = t.raw('items') as FaqItem[];
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-surface-alt border-border border-y py-20 sm:py-24">
      <div className="container-page max-w-3xl">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-11" />

        <div className="flex flex-col gap-3">
          {items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <Card key={item.q} className="overflow-hidden">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="text-ink flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold"
                  >
                    {item.q}
                    {isOpen ? (
                      <Minus className="text-ink-secondary size-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Plus className="text-ink-secondary size-5 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="text-ink-secondary px-6 pb-5 text-[15px] leading-relaxed"
                >
                  {item.a}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
