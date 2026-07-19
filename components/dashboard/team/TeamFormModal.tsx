'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { saveStaff } from '@/lib/dashboard/team.actions';
import type { TeamMember, ServiceOption } from '@/lib/dashboard/team';
import { useIsMobile } from '@/components/dashboard/calendar/useIsMobile';
import { cn } from '@/lib/utils';

const field = 'flex flex-col gap-1.5';
const label = 'text-ink-secondary text-sm font-semibold';

export function TeamFormModal({
  member,
  services,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  services: ServiceOption[];
  onClose: () => void;
  onSaved: (created: boolean) => void;
}) {
  const t = useTranslations('dashboard.team');
  const te = useTranslations('dashboard.team.errors');
  const tc = useTranslations('dashboard.actions');
  const isMobile = useIsMobile();

  const [name, setName] = useState(member?.name ?? '');
  const [role, setRole] = useState(member?.role ?? '');
  const [canViewAll, setCanViewAll] = useState(member?.canViewAll ?? false);
  const [serviceIds, setServiceIds] = useState<string[]>(member?.serviceIds ?? services.map((s) => s.id));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const res = await saveStaff({ id: member?.id, name, role, canViewAll, serviceIds });
    setLoading(false);
    if (res.ok) onSaved(!member);
    else setError(te(['nameRequired', 'planLimit'].includes(res.error) ? res.error : 'generic'));
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={member ? t('form.editTitle') : t('form.createTitle')}>
      <ModalHeader title={member ? t('form.editTitle') : t('form.createTitle')} onClose={onClose} closeLabel={tc('close')} />
      <div className="flex flex-col gap-4 overflow-y-auto p-5">
        <label className={field}>
          <span className={label}>{t('form.name')}</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.namePlaceholder')} />
        </label>
        <label className={field}>
          <span className={label}>{t('form.role')}</span>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('form.rolePlaceholder')} />
        </label>

        <div className="border-border rounded-input flex flex-col gap-1 border p-4">
          <div className="flex items-center justify-between">
            <span className="text-ink text-sm font-medium">{t('form.canViewAll')}</span>
            <Switch checked={canViewAll} onChange={setCanViewAll} label={t('form.canViewAll')} />
          </div>
          <p className="text-ink-tertiary text-xs">{t('form.canViewAllHint')}</p>
        </div>

        {services.length > 0 && (
          <div className={field}>
            <span className={label}>{t('form.services')}</span>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const on = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-secondary',
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-warning text-sm">{error}</p>}

        <Button onClick={submit} loading={loading} disabled={!name.trim()}>
          {loading ? tc('saving') : tc('save')}
        </Button>
      </div>
    </Modal>
  );
}
