'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DateTime } from 'luxon';
import { Search, UserPlus, Users } from 'lucide-react';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TableScroll, Table, Th, Td, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { formatMoney } from '@/lib/db/mappers';
import type { ClientRow } from '@/lib/dashboard/clients';
import { ClientFormModal } from './ClientFormModal';

export function ClientsView({
  clients,
  currency,
  locale,
}: {
  clients: ClientRow[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations('dashboard.clients');
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.fullName, c.email ?? '', c.phone ?? ''].some((f) => f.toLowerCase().includes(q)),
    );
  }, [clients, query]);

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle', { count: clients.length })}
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <UserPlus aria-hidden="true" />
            {t('newClient')}
          </Button>
        }
      />

      {clients.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Users className="text-ink-tertiary size-8" aria-hidden="true" />
          <h2 className="text-h3 text-ink">{t('empty.title')}</h2>
          <p className="text-ink-secondary max-w-sm text-sm">{t('empty.body')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="text-ink-tertiary absolute top-1/2 left-3.5 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-10"
              aria-label={t('searchPlaceholder')}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-ink-secondary py-8 text-center text-sm">{t('empty.noResults')}</p>
          ) : (
            <TableScroll>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('columns.client')}</Th>
                    <Th className="hidden sm:table-cell">{t('columns.contact')}</Th>
                    <Th className="hidden md:table-cell">{t('columns.lastVisit')}</Th>
                    <Th className="text-center">{t('columns.visits')}</Th>
                    <Th className="text-center">{t('columns.noShows')}</Th>
                    <Th className="text-right">{t('columns.spent')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <Tr key={c.id} interactive onClick={() => router.push(`/dashboard/clients/${c.id}`)}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="bg-surface-alt text-ink-secondary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                            {c.fullName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/clients/${c.id}`}
                              className="text-ink font-semibold hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.fullName}
                            </Link>
                            {c.isRisk && (
                              <span className="text-warning ml-2 text-xs font-semibold">
                                {t('riskFlag')}
                              </span>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td className="text-ink-secondary hidden sm:table-cell">
                        {c.email ?? c.phone ?? t('noContact')}
                      </Td>
                      <Td className="text-ink-secondary hidden md:table-cell">
                        {c.lastVisitIso
                          ? DateTime.fromISO(c.lastVisitIso).setLocale(locale).toLocaleString(DateTime.DATE_MED)
                          : t('never')}
                      </Td>
                      <Td className="text-center font-semibold">{c.visits}</Td>
                      <Td className="text-center">
                        {c.noShows > 0 ? (
                          <span className="text-warning font-semibold">{c.noShows}</span>
                        ) : (
                          <span className="text-ink-tertiary">0</span>
                        )}
                      </Td>
                      <Td className="text-right font-semibold">{formatMoney(c.spent, currency, locale)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </div>
      )}

      {creating && (
        <ClientFormModal
          client={null}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            toast(t('toast.created'));
            router.push(`/dashboard/clients/${id}`);
          }}
        />
      )}
    </div>
  );
}
