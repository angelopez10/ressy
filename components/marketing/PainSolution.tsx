import { useTranslations } from 'next-intl';
import { CalendarCheck, MessageSquareX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';

type Slot = { time: string; service: string; client: string };

/**
 * "Antes → Con Ressy": el caos de WhatsApp (burbujas de chat) frente a una agenda
 * ordenada de reservas confirmadas. Portado del mockup RessyLanding.
 */
export function PainSolution() {
  const t = useTranslations('marketing.pain');
  const chat = t.raw('chat') as string[];
  const slots = t.raw('slots') as Slot[];
  const accents = ['bg-success', 'bg-accent', 'bg-success'];

  return (
    <section className="container-page py-20 sm:py-24">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-12" />

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        {/* Antes: WhatsApp */}
        <Card className="bg-surface-alt p-7">
          <p className="text-warning mb-4 flex items-center gap-2 text-sm font-bold">
            <MessageSquareX className="size-4" aria-hidden="true" />
            {t('beforeTag')}
          </p>
          <div className="flex flex-col gap-2.5">
            {chat.map((message, i) => {
              const outgoing = i === 1; // el negocio responde una vez
              return (
                <p
                  key={message}
                  className={
                    outgoing
                      ? 'bg-accent-soft text-ink max-w-[80%] self-end rounded-2xl rounded-br-sm px-3.5 py-3 text-sm'
                      : 'bg-surface text-ink-secondary max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-3 text-sm'
                  }
                >
                  {message}
                </p>
              );
            })}
          </div>
        </Card>

        {/* Con Ressy: agenda */}
        <Card className="p-7">
          <p className="text-success mb-4 flex items-center gap-2 text-sm font-bold">
            <CalendarCheck className="size-4" aria-hidden="true" />
            {t('afterTag')}
          </p>
          <div className="flex flex-col gap-2.5">
            {slots.map((slot, i) => (
              <div
                key={slot.time}
                className="border-border flex items-center gap-3 rounded-xl border px-3.5 py-3"
              >
                <span
                  className={`${accents[i % accents.length]} h-8 w-1 shrink-0 rounded-full`}
                  aria-hidden="true"
                />
                <span className="flex-1">
                  <span className="text-ink block text-sm font-semibold">
                    {slot.time} · {slot.service}
                  </span>
                  <span className="text-ink-secondary block text-xs">{slot.client}</span>
                </span>
                <span className="text-success text-xs font-semibold">{t('confirmed')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
