'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DateTime } from 'luxon';
import { ArrowLeft, Pencil, AlertTriangle } from 'lucide-react';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { BookingStatusBadge } from '@/components/dashboard/BookingStatusBadge';
import { formatMoney } from '@/lib/db/mappers';
import { updateCustomerNotes } from '@/lib/dashboard/clients.actions';
import type { ClientDetail } from '@/lib/dashboard/clients';
import { ClientFormModal } from './ClientFormModal';

export function ClientDetailView({
  client,
  currency,
  locale,
  timezone,
}: {
  client: ClientDetail;
  currency: string;
  locale: string;
  timezone: string;
}) {
  const t = useTranslations('dashboard.clients');
  const tc = useTranslations('dashboard.actions');
  const router = useRouter();
  const { toast } = useToast();

  const [notes, setNotes] = useState(client.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const isRisk = client.noShows >= 2;

  async function saveNotes() {
    setSavingNotes(true);
    const res = await updateCustomerNotes({ id: client.id, notes, tags: client.tags });
    setSavingNotes(false);
    if (res.ok) toast(t('toast.noteSaved'));
    else toast(t('errors.generic'), 'error');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/clients" className="text-ink-secondary hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('title')}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="bg-surface-alt text-ink-secondary flex size-14 items-center justify-center rounded-full text-xl font-bold">
              {client.fullName.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-ink flex items-center gap-2 text-2xl font-bold tracking-tight">
                {client.fullName}
                {isRisk && (
                  <span className="text-warning inline-flex items-center gap-1 text-xs font-semibold">
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                    {t('riskFlag')}
                  </span>
                )}
              </h1>
              <p className="text-ink-secondary text-sm">
                {[client.email, client.phone].filter(Boolean).join(' · ') || t('noContact')}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            {tc('edit')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col gap-6">
          {/* Stats */}
          <Card className="grid grid-cols-3 gap-2 p-5 text-center">
            <Stat value={String(client.visits)} label={t('columns.visits')} />
            <Stat value={String(client.noShows)} label={t('columns.noShows')} warn={client.noShows > 0} />
            <Stat value={formatMoney(client.spent, currency, locale)} label={t('columns.spent')} />
          </Card>

          {/* Tags */}
          {client.tags.length > 0 && (
            <Card className="p-5">
              <p className="text-ink-tertiary mb-2 text-xs font-semibold tracking-wide uppercase">{t('detail.tags')}</p>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <Badge key={tag} tone="neutral">{tag}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card className="p-5">
            <p className="text-ink-tertiary mb-2 text-xs font-semibold tracking-wide uppercase">{t('detail.notes')}</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('detail.notesPlaceholder')} />
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={saveNotes} loading={savingNotes} disabled={notes === (client.notes ?? '')}>
                {t('detail.saveNotes')}
              </Button>
            </div>
          </Card>
        </div>

        {/* History */}
        <Card className="p-5">
          <h2 className="text-ink mb-4 text-base font-semibold">{t('detail.history')}</h2>
          {client.history.length === 0 ? (
            <p className="text-ink-secondary py-8 text-center text-sm">{t('detail.noHistory')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {client.history.map((h) => {
                const dt = DateTime.fromISO(h.startsAtIso, { zone: 'utc' }).setZone(timezone).setLocale(locale);
                return (
                  <li key={h.id} className="border-border flex items-center gap-3 rounded-xl border px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-ink text-sm font-semibold">{h.serviceName}</div>
                      <div className="text-ink-secondary text-xs">
                        {dt.toFormat("d LLL yyyy · HH:mm")}
                      </div>
                    </div>
                    <span className="text-ink-secondary text-sm">{formatMoney(h.priceAmount, currency, locale)}</span>
                    <BookingStatusBadge status={h.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {editing && (
        <ClientFormModal
          client={{ id: client.id, fullName: client.fullName, email: client.email, phone: client.phone }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast(t('toast.updated'));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Stat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <div>
      <div className={warn ? 'text-warning text-xl font-bold' : 'text-ink text-xl font-bold'}>{value}</div>
      <div className="text-ink-secondary text-xs">{label}</div>
    </div>
  );
}
