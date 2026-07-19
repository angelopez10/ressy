'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { checkSlug, uploadLogo } from '@/lib/onboarding/actions';
import { cn } from '@/lib/utils';
import { Field } from './fields';

export interface PageState {
  slug: string;
  accentColor: string;
  bookingLocale: 'es' | 'en';
  logoUrl: string | null;
}

const SWATCHES = ['#348D83', '#222222', '#C13515', '#3B5BDB', '#8A63D2', '#E8590C'];

export function Step4Page({
  value,
  onChange,
  businessId,
  businessName,
  locale,
  error,
}: {
  value: PageState;
  onChange: (v: PageState) => void;
  businessId: string;
  businessName?: string;
  locale: 'es' | 'en';
  error: string | null;
}) {
  const t = useTranslations('onboarding.step4');
  const set = (patch: Partial<PageState>) => onChange({ ...value, ...patch });
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Chequeo de disponibilidad del slug con debounce.
  useEffect(() => {
    const slug = value.slug.trim().toLowerCase();
    if (slug.length < 3 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const id = setTimeout(async () => {
      const res = await checkSlug(slug, businessId);
      setAvailable(res.available);
      setChecking(false);
    }, 400);
    return () => clearTimeout(id);
  }, [value.slug, businessId]);

  function onPickLogo(file: File) {
    const form = new FormData();
    form.set('file', file);
    startUpload(async () => {
      const res = await uploadLogo(businessId, form);
      if (res.ok) set({ logoUrl: res.data.url });
    });
  }

  const slugError = error === 'slugTaken' || error === 'slugFormat' || error === 'slugTooShort';

  return (
    <div>
      <h1 className="text-ink text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-ink-secondary text-small mt-1 mb-6">{t('subtitle')}</p>

      <div className="flex flex-col gap-5">
        {/* Slug */}
        <Field label={t('slug')} error={slugError ? t(`errors.${error}`) : undefined}>
          <div className="rounded-input border-border focus-within:border-accent flex items-stretch overflow-hidden border">
            <span className="bg-surface-alt text-ink-secondary border-border text-small flex items-center border-r px-3">
              getressy.com/
            </span>
            <input
              value={value.slug}
              onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
              placeholder="mi-negocio"
              className="text-ink h-12 min-w-0 flex-1 px-3 text-base outline-none"
            />
            <span className="flex items-center pr-3">
              {checking ? (
                <Loader2 className="text-ink-tertiary size-4 animate-spin" aria-hidden="true" />
              ) : available === true ? (
                <Check className="text-success size-5" aria-hidden="true" />
              ) : available === false ? (
                <X className="text-warning size-5" aria-hidden="true" />
              ) : null}
            </span>
          </div>
          {available === false && !slugError && (
            <span className="text-warning mt-1 block text-xs">{t('errors.slugTaken')}</span>
          )}
        </Field>

        {/* Logo */}
        <Field label={t('logo')}>
          <div className="flex items-center gap-4">
            <div className="bg-ink flex size-14 items-center justify-center overflow-hidden rounded-xl text-white">
              {value.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value.logoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-xl font-extrabold">
                  {(businessName ?? 'R').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="border-border text-ink hover:bg-surface-alt rounded-button text-small flex items-center gap-2 border px-4 py-2 font-semibold disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {t('uploadLogo')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickLogo(f);
              }}
            />
          </div>
        </Field>

        {/* Color de acento */}
        <Field label={t('accent')}>
          <div className="flex gap-2.5">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => set({ accentColor: c })}
                style={{ background: c }}
                className={cn(
                  'size-9 rounded-full transition-transform',
                  value.accentColor === c ? 'ring-ink ring-2 ring-offset-2' : 'hover:scale-105',
                )}
              />
            ))}
          </div>
        </Field>

        {/* Idioma de la página */}
        <Field label={t('language')}>
          <div className="border-border rounded-button inline-flex border p-1">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set({ bookingLocale: l })}
                className={cn(
                  'rounded-button text-small px-4 py-1.5 font-semibold transition-colors',
                  value.bookingLocale === l ? 'bg-ink text-white' : 'text-ink-secondary',
                )}
              >
                {l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </Field>

        {/* Preview */}
        <div>
          <p className="text-ink-tertiary mb-2 text-xs font-semibold tracking-wide uppercase">
            {t('preview')}
          </p>
          <div className="border-border rounded-card shadow-card overflow-hidden border">
            <div className="h-16" style={{ background: value.accentColor }} />
            <div className="px-4 pt-0 pb-4">
              <div className="bg-ink -mt-6 flex size-11 items-center justify-center overflow-hidden rounded-xl border-2 border-white text-white">
                {value.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={value.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="font-extrabold">
                    {(businessName ?? 'R').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-ink mt-2 font-bold">{businessName || t('yourBusiness')}</p>
              <p className="text-ink-tertiary text-xs break-all">
                getressy.com/{value.slug || 'mi-negocio'}
              </p>
              <div
                className="rounded-button text-small mt-3 flex h-9 items-center justify-center font-semibold text-white"
                style={{ background: value.accentColor }}
              >
                {locale === 'en' ? 'Book' : 'Reservar'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
