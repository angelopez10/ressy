import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { routing } from '@/lib/i18n/routing';

// Una sola familia para todo el producto (CLAUDE.md §5).
// Expone `--font-plus-jakarta`, que `globals.css` consume vía `--font-sans`.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
  weight: ['400', '600', '800'],
});

export const metadata: Metadata = {
  title: 'Ressy',
  description: 'Booking software for service businesses.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Habilita el renderizado estático de las páginas bajo este layout.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={plusJakarta.variable}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
