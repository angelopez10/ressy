import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { getUser, getUserBusiness } from '@/lib/auth/session';
import { loadOnboardingDraft } from '@/lib/onboarding/state';
import type { Locale } from '@/lib/i18n/routing';

type Props = { params: Promise<{ locale: Locale }> };

/**
 * Onboarding wizard. Guard server-side:
 *   - sin sesión → login
 *   - negocio ya publicado → dashboard (no re-onboardear)
 * Si hay borrador a medias, el wizard retoma en el paso correspondiente.
 */
export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/login`);

  const business = await getUserBusiness();
  if (business?.isPublished) redirect(`/${locale}/dashboard`);

  const draft = await loadOnboardingDraft();

  return <OnboardingWizard draft={draft} locale={locale} />;
}
