'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';

/** Un tramo de horario semanal (hora LOCAL del negocio, CLAUDE.md §3). */
export interface DayHours {
  weekday: number; // 1=lunes … 7=domingo
  startTime: string; // 'HH:MM'
  endTime: string;
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

interface Row {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
}

function toRows(initial: DayHours[]): Row[] {
  return DAY_KEYS.map((_, i) => {
    const weekday = i + 1;
    const found = initial.find((d) => d.weekday === weekday);
    return {
      weekday,
      enabled: Boolean(found),
      start: found?.startTime.slice(0, 5) ?? '09:00',
      end: found?.endTime.slice(0, 5) ?? '18:00',
    };
  });
}

/**
 * Editor de horario semanal reutilizable: horario del negocio (business_hours) y
 * horario de cada profesional (staff_schedules) tienen la misma forma. Guarda vía
 * el `onSave` que le pasa el consumidor (server action).
 */
export function WeeklyHoursEditor({
  initial,
  onSave,
}: {
  initial: DayHours[];
  onSave: (days: DayHours[]) => Promise<boolean>;
}) {
  const t = useTranslations('dashboard.settings.hours');
  const td = useTranslations('onboarding.days');
  const tc = useTranslations('dashboard.actions');
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [saving, setSaving] = useState(false);

  function update(weekday: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  function copyMonday() {
    const mon = rows[0]!;
    setRows((prev) => prev.map((r) => ({ ...r, enabled: mon.enabled, start: mon.start, end: mon.end })));
  }

  async function save() {
    setSaving(true);
    const days = rows
      .filter((r) => r.enabled)
      .map((r) => ({ weekday: r.weekday, startTime: r.start, endTime: r.end }));
    await onSave(days);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={copyMonday}
        className="text-accent hover:text-accent-hover inline-flex w-fit items-center gap-1.5 text-sm font-semibold"
      >
        <Copy className="size-4" aria-hidden="true" />
        {t('copyMonday')}
      </button>

      {rows.map((r, i) => (
        <div key={r.weekday} className="border-border flex items-center gap-3 rounded-input border px-3.5 py-2.5">
          <div className="flex w-32 items-center gap-2.5">
            <Switch checked={r.enabled} onChange={(v) => update(r.weekday, { enabled: v })} label={td(DAY_KEYS[i]!)} />
            <span className="text-ink text-sm font-medium capitalize">{td(DAY_KEYS[i]!)}</span>
          </div>
          {r.enabled ? (
            <div className="flex flex-1 items-center gap-2">
              <Input type="time" value={r.start} onChange={(e) => update(r.weekday, { start: e.target.value })} className="h-10 w-32" />
              <span className="text-ink-tertiary">–</span>
              <Input type="time" value={r.end} onChange={(e) => update(r.weekday, { end: e.target.value })} className="h-10 w-32" />
            </div>
          ) : (
            <span className="text-ink-tertiary flex-1 text-sm">{t('closed')}</span>
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <Button size="sm" onClick={save} loading={saving}>
          {saving ? tc('saving') : tc('save')}
        </Button>
      </div>
    </div>
  );
}
