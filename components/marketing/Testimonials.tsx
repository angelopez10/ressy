import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';

type Testimonial = { quote: string; name: string; role: string };

/**
 * Testimonios. Los quotes de `marketing.testimonials.items` son PLACEHOLDERS
 * estructurados; reemplazarlos por citas reales de beta testers cuando existan.
 * El avatar es la inicial del nombre (sin fotos por ahora).
 */
export function Testimonials() {
  const t = useTranslations('marketing.testimonials');
  const items = t.raw('items') as Testimonial[];

  return (
    <section className="container-page py-20 sm:py-24">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-12" />

      <ul className="grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.name}>
            <Card className="h-full p-7">
              <div className="mb-4 flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="text-accent fill-accent size-4" />
                ))}
              </div>
              <blockquote className="text-ink mb-5 text-base leading-relaxed">
                “{item.quote}”
              </blockquote>
              <div className="flex items-center gap-3">
                <span className="bg-surface-alt text-ink-secondary flex size-10 items-center justify-center rounded-full text-sm font-bold">
                  {item.name.charAt(0)}
                </span>
                <span>
                  <span className="text-ink block text-sm font-semibold">{item.name}</span>
                  <span className="text-ink-secondary block text-[13px]">{item.role}</span>
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
