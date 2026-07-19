'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ExternalLink, Loader2, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/db/client';
import { saveBookingPage, updateLogoUrl, checkSlug } from '@/lib/dashboard/settings.actions';
import type { SettingsBusiness } from './SettingsView';

const field = 'flex flex-col gap-1.5';
const label = 'text-ink-secondary text-sm font-semibold';

export function PageTab({ business, locale }: { business: SettingsBusiness; locale: string }) {
  const t = useTranslations('dashboard.settings');
  const tc = useTranslations('dashboard.actions');
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [slug, setSlug] = useState(business.slug);
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const [accent, setAccent] = useState(business.accentColor ?? '#348D83');
  const [lang, setLang] = useState<'es' | 'en'>(business.bookingLocale);
  const [published, setPublished] = useState(business.isPublished);
  const [logoUrl, setLogoUrl] = useState(business.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Chequeo de slug con debounce.
  useEffect(() => {
    const cleaned = slug.trim().toLowerCase();
    if (cleaned === business.slug || cleaned.length < 2) {
      setSlugState('idle');
      return;
    }
    setSlugState('checking');
    const h = setTimeout(async () => {
      const ok = await checkSlug(cleaned);
      setSlugState(ok ? 'ok' : 'taken');
    }, 400);
    return () => clearTimeout(h);
  }, [slug, business.slug]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const db = createClient();
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${business.id}/logo-${Date.now()}.${ext}`;
      const { error } = await db.storage.from('business-logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = db.storage.from('business-logos').getPublicUrl(path);
      const res = await updateLogoUrl(data.publicUrl);
      if (res.ok) {
        setLogoUrl(data.publicUrl);
        toast(t('toast.saved'));
      } else toast(t('errors.generic'), 'error');
    } catch {
      toast(t('errors.generic'), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setLoading(true);
    const res = await saveBookingPage({
      slug: slug.trim().toLowerCase(),
      accentColor: accent,
      bookingLocale: lang,
      isPublished: published,
    });
    setLoading(false);
    if (res.ok) toast(t('toast.saved'));
    else toast(t(res.error === 'slugTaken' ? 'errors.slugTaken' : res.error === 'slugFormat' ? 'errors.slugFormat' : 'errors.generic'), 'error');
  }

  return (
    <div className="flex flex-col gap-4">
      <label className={field}>
        <span className={label}>{t('page.slug')}</span>
        <div className="relative">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="pr-28" />
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold">
            {slugState === 'checking' && (
              <span className="text-ink-tertiary inline-flex items-center gap-1">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                {t('page.slugChecking')}
              </span>
            )}
            {slugState === 'ok' && (
              <span className="text-success inline-flex items-center gap-1">
                <Check className="size-3.5" aria-hidden="true" />
                {t('page.slugAvailable')}
              </span>
            )}
            {slugState === 'taken' && (
              <span className="text-warning inline-flex items-center gap-1">
                <X className="size-3.5" aria-hidden="true" />
                {t('page.slugTaken')}
              </span>
            )}
          </span>
        </div>
        <span className="text-ink-tertiary text-xs">{t('page.slugHint')}</span>
      </label>

      {/* Logo */}
      <div className={field}>
        <span className={label}>{t('page.logo')}</span>
        <div className="flex items-center gap-3">
          <div className="border-border bg-surface-alt flex size-16 items-center justify-center overflow-hidden rounded-xl border">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="size-full object-cover" />
            ) : (
              <Upload className="text-ink-tertiary size-5" aria-hidden="true" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload aria-hidden="true" />
            {t('page.logo')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={field}>
          <span className={label}>{t('page.accent')}</span>
          <div className="flex items-center gap-2">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="border-border size-11 rounded-lg border" aria-label={t('page.accent')} />
            <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
          </div>
        </label>
        <label className={field}>
          <span className={label}>{t('page.language')}</span>
          <Select value={lang} onChange={(e) => setLang(e.target.value as 'es' | 'en')}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </Select>
        </label>
      </div>

      <label className="border-border flex items-center justify-between rounded-input border px-4 py-3">
        <span className="text-ink text-sm font-medium">{t('page.published')}</span>
        <Switch checked={published} onChange={setPublished} label={t('page.published')} />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} loading={loading} disabled={slugState === 'taken'}>
          {loading ? tc('saving') : tc('save')}
        </Button>
        <a
          href={`/${locale}/${business.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover inline-flex items-center gap-1.5 text-sm font-semibold"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          {t('page.openPage')}
        </a>
      </div>
    </div>
  );
}
