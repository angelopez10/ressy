'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, Eye, EyeOff, Pencil, Trash2, UserPlus, Users, Zap } from 'lucide-react';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { removeStaff } from '@/lib/dashboard/team.actions';
import type { TeamMember, ServiceOption } from '@/lib/dashboard/team';
import type { DayHours } from '@/components/dashboard/WeeklyHoursEditor';
import { TeamFormModal } from './TeamFormModal';
import { StaffScheduleModal } from './StaffScheduleModal';

export function TeamView({
  team,
  services,
  schedules,
  used,
  limit,
}: {
  team: TeamMember[];
  services: ServiceOption[];
  schedules: Record<string, DayHours[]>;
  used: number;
  limit: number;
}) {
  const t = useTranslations('dashboard.team');
  const tc = useTranslations('dashboard.actions');
  const router = useRouter();
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [scheduling, setScheduling] = useState<TeamMember | null>(null);
  const [removingItem, setRemovingItem] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState(false);

  const atLimit = used >= limit;
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name;

  async function doRemove() {
    if (!removingItem) return;
    setBusy(true);
    const res = await removeStaff(removingItem.id);
    setBusy(false);
    setRemovingItem(null);
    if (res.ok) {
      toast(t('toast.removed'));
      router.refresh();
    } else toast(t('errors.generic'), 'error');
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <div className="flex items-center gap-3">
            <span className="text-ink-secondary hidden text-sm sm:inline">
              {t('limit.usage', { used, limit })}
            </span>
            <Button size="sm" onClick={() => setCreating(true)} disabled={atLimit}>
              <UserPlus aria-hidden="true" />
              {t('addStaff')}
            </Button>
          </div>
        }
      />

      {atLimit && (
        <Card className="border-accent/40 bg-accent-soft mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-ink flex items-center gap-2 text-sm font-medium">
            <Zap className="text-accent size-4" aria-hidden="true" />
            {t('limit.reached', { limit })}
          </span>
          <Button size="sm" variant="secondary" asChild>
            <Link href="/dashboard/settings?tab=plan">{t('limit.upgrade')}</Link>
          </Button>
        </Card>
      )}

      {team.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Users className="text-ink-tertiary size-8" aria-hidden="true" />
          <h2 className="text-h3 text-ink">{t('empty.title')}</h2>
          <p className="text-ink-secondary max-w-sm text-sm">{t('empty.body')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => (
            <Card key={m.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="bg-surface-alt text-ink-secondary flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-ink truncate font-semibold">{m.name}</div>
                  {m.role && <div className="text-ink-secondary truncate text-sm">{m.role}</div>}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {m.canViewAll ? (
                  <span className="text-accent inline-flex items-center gap-1 font-medium">
                    <Eye className="size-3.5" aria-hidden="true" />
                    {t('viewsAll')}
                  </span>
                ) : (
                  <span className="text-ink-secondary inline-flex items-center gap-1">
                    <EyeOff className="size-3.5" aria-hidden="true" />
                    {t('viewsOwn')}
                  </span>
                )}
              </div>

              <p className="text-ink-secondary text-xs">
                {m.serviceIds.length === 0
                  ? t('noServices')
                  : m.serviceIds.map(serviceName).filter(Boolean).join(', ')}
              </p>

              <div className="mt-auto flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(m)}>
                  <Pencil aria-hidden="true" />
                  {tc('edit')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setScheduling(m)} aria-label={tc('edit')}>
                  <CalendarClock aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="sm" className="text-warning" onClick={() => setRemovingItem(m)} aria-label={tc('remove')}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TeamFormModal
          member={editing}
          services={services}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(created) => {
            setCreating(false);
            setEditing(null);
            toast(created ? t('toast.created') : t('toast.updated'));
            router.refresh();
          }}
        />
      )}

      {scheduling && (
        <StaffScheduleModal
          staffId={scheduling.id}
          staffName={scheduling.name}
          initial={schedules[scheduling.id] ?? []}
          onClose={() => setScheduling(null)}
          onSaved={() => {
            setScheduling(null);
            toast(t('toast.updated'));
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={removingItem !== null}
        title={t('confirm.removeTitle')}
        body={t('confirm.removeBody')}
        confirmLabel={tc('remove')}
        cancelLabel={tc('cancel')}
        loading={busy}
        onConfirm={doRemove}
        onCancel={() => setRemovingItem(null)}
      />
    </div>
  );
}
