import { useTranslations } from 'next-intl';
import { Dumbbell, Flower2, PenTool, Scale, Scissors, Stethoscope } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const VERTICALS: { key: string; Icon: LucideIcon }[] = [
  { key: 'barber', Icon: Scissors },
  { key: 'spa', Icon: Flower2 },
  { key: 'clinic', Icon: Stethoscope },
  { key: 'fitness', Icon: Dumbbell },
  { key: 'legal', Icon: Scale },
  { key: 'tattoo', Icon: PenTool },
];

/** Barra de confianza: verticales para las que Ressy está pensado. */
export function TrustBar() {
  const t = useTranslations('marketing.trust');

  return (
    <section className="bg-surface-alt border-border border-y py-9">
      <div className="container-page text-center">
        <p className="text-ink-secondary mb-5 text-sm font-semibold">{t('label')}</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {VERTICALS.map(({ key, Icon }) => (
            <li key={key} className="text-ink flex items-center gap-2.5 text-base font-semibold">
              <Icon className="text-ink-secondary size-5" aria-hidden="true" />
              {t(`verticals.${key}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
