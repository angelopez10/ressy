import { useTranslations } from 'next-intl';
import { BarChart3, Contact, CreditCard, MessageCircle, Palette, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';

type Feature = { title: string; body: string };

// Mismo orden que `marketing.features.items`.
const ICONS: LucideIcon[] = [MessageCircle, CreditCard, Palette, Users, Contact, BarChart3];

/** Grid 2×3 de features. */
export function Features() {
  const t = useTranslations('marketing.features');
  const items = t.raw('items') as Feature[];

  return (
    <section id="features" className="container-page py-20 sm:py-24">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-12" />

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const Icon = ICONS[i] ?? MessageCircle;
          return (
            <li key={item.title}>
              <Card interactive className="hover:border-border/0 h-full p-7">
                <span className="bg-accent-soft text-accent-hover rounded-input mb-4 flex size-11 items-center justify-center">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-ink mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-ink-secondary text-[15px] leading-relaxed">{item.body}</p>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
