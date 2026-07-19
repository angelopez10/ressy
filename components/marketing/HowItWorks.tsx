import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';

type Step = { title: string; body: string };

/** Cómo funciona en 3 pasos. El `id` ancla el CTA secundario del hero. */
export function HowItWorks() {
  const t = useTranslations('marketing.how');
  const steps = t.raw('steps') as Step[];

  return (
    <section id="how-it-works" className="bg-surface-alt border-border border-y py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-12" />

        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Card interactive className="hover:border-border/0 h-full p-8">
                <span className="bg-accent-soft text-accent-hover rounded-input mb-5 flex size-11 items-center justify-center text-lg font-extrabold">
                  {i + 1}
                </span>
                <h3 className="text-h3 text-ink mb-2">{step.title}</h3>
                <p className="text-ink-secondary text-[15px] leading-relaxed">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
