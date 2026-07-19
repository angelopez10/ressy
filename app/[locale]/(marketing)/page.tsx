import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { Hero } from '@/components/marketing/Hero';
import { TrustBar } from '@/components/marketing/TrustBar';
import { PainSolution } from '@/components/marketing/PainSolution';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Features } from '@/components/marketing/Features';
import { PricingSection } from '@/components/marketing/PricingSection';
import { Testimonials } from '@/components/marketing/Testimonials';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { FinalCta } from '@/components/marketing/FinalCta';

type Props = { params: Promise<{ locale: string }> };

// Sitio en producción; se usa como base para OG y alternates hreflang.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://getressy.com';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketing.meta' });

  const title = t('title');
  const description = t('description');

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      // hreflang para ambos idiomas + x-default apuntando al español (defaultLocale).
      languages: {
        es: '/es',
        en: '/en',
        'x-default': `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Ressy',
      title,
      description,
      url: `/${locale}`,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function MarketingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <TrustBar />
      <PainSolution />
      <HowItWorks />
      <Features />
      <PricingSection />
      <Testimonials />
      <FaqAccordion />
      <FinalCta />
    </>
  );
}
