'use client';

import { useTranslations } from 'next-intl';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { WeeklyHoursEditor, type DayHours } from '@/components/dashboard/WeeklyHoursEditor';
import { saveStaffSchedule } from '@/lib/dashboard/hours.actions';
import { useToast } from '@/components/ui/Toast';
import { useIsMobile } from '@/components/dashboard/calendar/useIsMobile';

/** Editor del horario semanal de un profesional (staff_schedules). */
export function StaffScheduleModal({
  staffId,
  staffName,
  initial,
  onClose,
  onSaved,
}: {
  staffId: string;
  staffName: string;
  initial: DayHours[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const tc = useTranslations('dashboard.actions');
  const t = useTranslations('dashboard.settings.hours');
  const { toast } = useToast();
  const isMobile = useIsMobile();

  async function save(days: DayHours[]): Promise<boolean> {
    const res = await saveStaffSchedule(staffId, days);
    if (res.ok) {
      onSaved();
      return true;
    }
    toast(tc('retry'), 'error');
    return false;
  }

  return (
    <Modal open onClose={onClose} side={isMobile ? 'bottom' : 'center'} label={t('title')}>
      <ModalHeader title={`${t('title')} · ${staffName}`} onClose={onClose} closeLabel={tc('close')} />
      <div className="overflow-y-auto p-5">
        <WeeklyHoursEditor initial={initial} onSave={save} />
      </div>
    </Modal>
  );
}
