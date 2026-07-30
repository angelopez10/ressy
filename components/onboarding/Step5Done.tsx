'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Download, MessageCircle, PartyPopper } from 'lucide-react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { track, setBusinessGroup } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Paso 5 — el momento "aha". La página ya está publicada y es reservable. QR
 * descargable, link para copiar y compartir directo. Celebración sobria (fade+
 * scale al montar), sin confeti estridente.
 */
export function Step5Done({
  slug,
  accentColor,
  locale,
  businessId,
}: {
  slug: string;
  accentColor: string;
  locale: 'es' | 'en';
  /** Presente en el flujo de onboarding; ausente para el retorno (WelcomeView). */
  businessId?: string | null;
}) {
  const t = useTranslations('onboarding.step5');
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(true);
    // Atribuye los eventos de compartir al negocio (funnel de onboarding por
    // grupo), sin crear un perfil personal.
    if (businessId) setBusinessGroup(businessId);
    const bookingUrl = `${window.location.origin}/${locale}/${slug}`;
    setUrl(bookingUrl);
    QRCode.toDataURL(bookingUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#222222', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [slug, locale, businessId]);

  // Muestra el link sin protocolo, más legible.
  const prettyUrl = url.replace(/^https?:\/\//, '');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      track('booking_link_shared', { channel: 'copy' });
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard bloqueado: no rompas la pantalla */
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(t('shareText', { url }))}`;

  return (
    <div className="text-center">
      <div
        className={cn(
          'bg-success-soft text-success mx-auto mb-5 flex size-20 items-center justify-center rounded-full transition-all duration-500',
          shown ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
      >
        <PartyPopper className="size-9" aria-hidden="true" />
      </div>

      <h1 className="text-ink text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-ink-secondary text-small mx-auto mt-1.5 mb-6 max-w-sm">{t('subtitle')}</p>

      {/* QR */}
      <div className="border-border rounded-card mx-auto mb-5 inline-flex border p-4">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR" width={160} height={160} className="size-40" />
        ) : (
          <div className="bg-surface-alt size-40 animate-pulse rounded" />
        )}
      </div>

      {/* Link + copiar */}
      <div className="border-border rounded-input mb-3 flex items-stretch overflow-hidden border">
        <span className="text-ink text-small flex-1 truncate px-3 py-3 text-left">{prettyUrl}</span>
        <button
          type="button"
          onClick={copy}
          className="bg-ink text-small flex items-center gap-1.5 px-4 font-semibold text-white"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>

      {/* Compartir + descargar */}
      <div className="flex flex-col gap-2.5">
        <Button asChild style={{ background: accentColor }}>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('booking_link_shared', { channel: 'whatsapp' })}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t('shareWhatsapp')}
          </a>
        </Button>
        {qr && (
          <Button asChild variant="secondary">
            <a
              href={qr}
              download={`${slug}-qr.png`}
              onClick={() => track('booking_link_shared', { channel: 'qr' })}
            >
              <Download className="size-4" aria-hidden="true" />
              {t('downloadQr')}
            </a>
          </Button>
        )}
      </div>

      <Link
        href="/dashboard"
        className="text-ink-secondary hover:text-ink text-small mt-6 inline-flex items-center gap-1.5 font-semibold"
      >
        {t('goToDashboard')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
