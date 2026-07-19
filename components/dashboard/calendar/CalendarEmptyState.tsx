'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';
import { CalendarPlus, Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Estado vacío ACCIONABLE (activación): en vez de una grilla muerta, el puente
 * entre onboarding y la primera reserva. Muestra el QR y el link de la booking
 * page para compartir. Aparece cuando el rango visible no tiene reservas.
 */
export function CalendarEmptyState({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations('dashboard.calendar.empty');
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const bookingUrl = `${window.location.origin}/${locale}/${slug}`;
    setUrl(bookingUrl);
    QRCode.toDataURL(bookingUrl, { width: 200, margin: 1, color: { dark: '#222222', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [slug, locale]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard bloqueado: no rompas la pantalla */
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(url)}`;

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="bg-surface-alt text-ink-tertiary mx-auto mb-5 flex size-16 items-center justify-center rounded-full">
          <CalendarPlus className="size-8" aria-hidden="true" />
        </div>
        <h2 className="text-h3 text-ink">{t('title')}</h2>
        <p className="text-ink-secondary mt-2 text-sm">{t('body')}</p>

        <div className="border-border mx-auto my-6 inline-flex rounded-card border p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR" width={140} height={140} className="size-36" />
          ) : (
            <div className="bg-surface-alt size-36 animate-pulse rounded" />
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <Button asChild>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Share2 aria-hidden="true" />
              {t('share')}
            </a>
          </Button>
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? t('copied') : t('copy')}
          </Button>
        </div>
      </div>
    </div>
  );
}
