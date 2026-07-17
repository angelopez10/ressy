'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

/**
 * Client component solo por el demo del estado `loading`: es la única parte de
 * la styleguide con interactividad real (CLAUDE.md §6).
 */
export function ButtonShowcase() {
  const t = useTranslations('styleguide.buttons');
  const [loading, setLoading] = useState(false);

  function simulate() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" loading={loading} onClick={simulate}>
          {loading ? t('loading') : t('primary')}
        </Button>
        <Button variant="secondary">{t('secondary')}</Button>
        <Button variant="ghost">{t('ghost')}</Button>
        <Button variant="primary" disabled>
          {t('disabled')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">{t('primary')}</Button>
        <Button size="md">{t('primary')}</Button>
        <Button size="lg">{t('primary')}</Button>
      </div>

      <p className="text-small text-ink-tertiary">{t('loadingHint')}</p>
    </div>
  );
}
