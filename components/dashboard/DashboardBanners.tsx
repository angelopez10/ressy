'use client';

import { useTranslations } from 'next-intl';
import { Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Banners persistentes del dashboard (CLAUDE.md §Prompt 09):
 *  - Trial: días restantes de Team + CTA. Más notorio en los últimos 3 días.
 *  - Tope de reservas (solo Free): felicitación con CTA desde 18/23; alerta de
 *    "estás perdiendo reservas" al topar 25. Tono de crecimiento, no técnico.
 *
 * Recibe primitivos ya calculados en el server (nada de Infinity: el ilimitado
 * no llega hasta acá porque estos banners solo aplican a límites reales).
 */
export function DashboardBanners({
  trial,
  bookings,
  upgradeHref = '/dashboard/settings',
}: {
  trial: { isTrial: boolean; daysLeft: number; endingSoon: boolean };
  /** Solo se pasa cuando el plan tiene tope real de reservas (Free). */
  bookings: { used: number; limit: number; atLimit: boolean } | null;
  upgradeHref?: string;
}) {
  const t = useTranslations('dashboard.banners');

  const showTrial = trial.isTrial && trial.daysLeft > 0;
  // Umbral de aviso in-app: desde 18 de 25 (BOOKING_NUDGE_THRESHOLDS en config).
  const showBookings = bookings != null && bookings.used >= 18;

  if (!showTrial && !showBookings) return null;

  return (
    <div className="flex flex-col gap-2">
      {showTrial ? (
        <Banner
          tone={trial.endingSoon ? 'warning' : 'accent'}
          Icon={Clock}
          text={t('trial.text', { days: trial.daysLeft })}
          cta={t('trial.cta')}
          href={upgradeHref}
          from="trial_banner"
        />
      ) : null}

      {showBookings ? (
        <Banner
          tone={bookings.atLimit ? 'warning' : 'accent'}
          Icon={bookings.atLimit ? AlertTriangle : Sparkles}
          text={
            bookings.atLimit
              ? t('bookings.reached', { limit: bookings.limit })
              : t('bookings.approaching', { used: bookings.used, limit: bookings.limit })
          }
          cta={t('bookings.cta')}
          href={upgradeHref}
          from="bookings_banner"
        />
      ) : null}
    </div>
  );
}

function Banner({
  tone,
  Icon,
  text,
  cta,
  href,
  from,
}: {
  tone: 'accent' | 'warning';
  Icon: typeof Clock;
  text: string;
  cta: string;
  href: string;
  /** De dónde salió el CTA de upgrade (para el funnel de conversión). */
  from: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border px-4 py-2.5 text-sm',
        tone === 'warning'
          ? 'border-warning/25 bg-warning/[0.06] text-warning'
          : 'border-accent/25 bg-accent-soft text-ink',
      )}
      role="status"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-medium">{text}</span>
      <Link
        href={href}
        onClick={() => track('upgrade_cta_clicked', { from })}
        className={cn(
          'shrink-0 font-semibold underline underline-offset-2',
          tone === 'warning' ? 'text-warning' : 'text-accent',
        )}
      >
        {cta}
      </Link>
    </div>
  );
}
