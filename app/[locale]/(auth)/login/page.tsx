import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { getUser } from '@/lib/auth/session';
import type { Locale } from '@/lib/i18n/routing';

type Props = { params: Promise<{ locale: Locale }> };

/**
 * Entrada de auth (magic link + Google). Si ya hay sesión, no tiene sentido el
 * login: al onboarding, que a su vez decide si va al dashboard.
 */
export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (user) redirect(`/${locale}/onboarding`);

  return (
    <main className="bg-surface-alt flex min-h-screen items-center justify-center px-5 py-12">
      <LoginForm nextPath={`/${locale}/onboarding`} />
    </main>
  );
}
