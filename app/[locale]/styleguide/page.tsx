import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Clock } from 'lucide-react';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ButtonShowcase } from './ButtonShowcase';

type Props = { params: Promise<{ locale: string }> };

export default async function StyleguidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Styleguide />;
}

/** Muestra los tokens directo desde CSS: si el theme cambia, esto cambia solo. */
const SWATCHES = [
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-hover', className: 'bg-accent-hover' },
  { name: 'accent-soft', className: 'bg-accent-soft' },
  { name: 'ink', className: 'bg-ink' },
  { name: 'ink-secondary', className: 'bg-ink-secondary' },
  { name: 'ink-tertiary', className: 'bg-ink-tertiary' },
  { name: 'border', className: 'bg-border' },
  { name: 'surface-alt', className: 'bg-surface-alt' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border flex flex-col gap-6 border-t py-12">
      <h2 className="text-small text-ink-tertiary font-semibold tracking-widest uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Styleguide() {
  const t = useTranslations('styleguide');

  return (
    <main className="bg-surface min-h-screen">
      <div className="container-page max-w-4xl py-16">
        <div className="mb-4 flex justify-end">
          <LocaleSwitcher />
        </div>

        <h1 className="text-display text-ink">{t('title')}</h1>
        <p className="text-body text-ink-secondary mt-4 max-w-xl">{t('subtitle')}</p>

        <Section title={t('sections.typography')}>
          <div className="flex flex-col gap-6">
            <p className="text-display text-ink">{t('typography.display')}</p>
            <p className="text-h2 text-ink">{t('typography.h2')}</p>
            <p className="text-h3 text-ink">{t('typography.h3')}</p>
            <p className="text-body text-ink max-w-2xl">{t('typography.body')}</p>
            <p className="text-small text-ink-secondary">{t('typography.small')}</p>
          </div>
        </Section>

        <Section title={t('sections.buttons')}>
          <ButtonShowcase />
        </Section>

        <Section title={t('sections.inputs')}>
          <div className="grid max-w-md gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="sg-name" className="text-small text-ink font-semibold">
                {t('inputs.nameLabel')}
              </label>
              <Input id="sg-name" placeholder={t('inputs.namePlaceholder')} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="sg-email" className="text-small text-ink font-semibold">
                {t('inputs.emailLabel')}
              </label>
              <Input id="sg-email" type="email" placeholder={t('inputs.emailPlaceholder')} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="sg-phone" className="text-small text-ink font-semibold">
                {t('inputs.errorLabel')}
              </label>
              <Input
                id="sg-phone"
                aria-invalid="true"
                aria-describedby="sg-phone-error"
                placeholder={t('inputs.errorPlaceholder')}
              />
              <p id="sg-phone-error" className="text-small text-warning">
                {t('inputs.errorMessage')}
              </p>
            </div>
          </div>
        </Section>

        <Section title={t('sections.card')}>
          <Card interactive className="max-w-sm">
            <CardHeader>
              <div className="text-ink-secondary flex items-center gap-2">
                <Clock className="size-5" aria-hidden="true" />
                <span className="text-small">{t('card.duration')}</span>
              </div>
              <CardTitle>{t('card.title')}</CardTitle>
              <p className="text-body text-ink-secondary">{t('card.body')}</p>
            </CardHeader>
            <CardContent>
              <p className="text-h3 text-ink">{t('card.price')}</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                {t('buttons.primary')}
              </Button>
            </CardFooter>
          </Card>
        </Section>

        <Section title={t('sections.badges')}>
          <div className="flex flex-wrap gap-3">
            <Badge tone="success">{t('badges.confirmed')}</Badge>
            <Badge tone="accent">{t('badges.pending')}</Badge>
            <Badge tone="warning">{t('badges.cancelled')}</Badge>
            <Badge tone="neutral">{t('badges.completed')}</Badge>
          </div>
        </Section>

        <Section title={t('sections.colors')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {SWATCHES.map(({ name, className }) => (
              <div key={name} className="flex flex-col gap-2">
                <div className={`rounded-input border-border h-16 border ${className}`} />
                <code className="text-small text-ink-secondary">{name}</code>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
