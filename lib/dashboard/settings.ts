import 'server-only';

/** Lecturas de Ajustes: políticas + horario del negocio + uso de staff. */

import { createClient } from '@/lib/db/server';
import type { Enums } from '@/lib/db/types';
import type { DayHours } from '@/components/dashboard/WeeklyHoursEditor';

export interface PoliciesData {
  minLeadTimeMin: number;
  maxAdvanceDays: number;
  cancellationWindowHours: number;
  depositType: Enums<'deposit_type'>;
  depositPercent: number | null;
  depositAmount: number | null;
  noShowFeeAmount: number;
}

export interface SettingsData {
  policies: PoliciesData;
  hours: DayHours[];
  staffCount: number;
}

export async function getSettingsData(businessId: string): Promise<SettingsData> {
  const db = await createClient();
  const [{ data: policies }, { data: hours }, { count }] = await Promise.all([
    db
      .from('business_policies')
      .select('min_lead_time_min, max_advance_days, cancellation_window_hours, deposit_type, deposit_percent, deposit_amount, no_show_fee_amount')
      .eq('business_id', businessId)
      .maybeSingle(),
    db.from('business_hours').select('weekday, open_time, close_time').eq('business_id', businessId),
    db.from('staff_members').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('is_active', true),
  ]);

  return {
    policies: {
      minLeadTimeMin: policies?.min_lead_time_min ?? 60,
      maxAdvanceDays: policies?.max_advance_days ?? 60,
      cancellationWindowHours: policies?.cancellation_window_hours ?? 24,
      depositType: policies?.deposit_type ?? 'none',
      depositPercent: policies?.deposit_percent ?? null,
      depositAmount: policies?.deposit_amount ?? null,
      noShowFeeAmount: policies?.no_show_fee_amount ?? 0,
    },
    hours: (hours ?? []).map((h) => ({
      weekday: h.weekday,
      startTime: h.open_time,
      endTime: h.close_time,
    })),
    staffCount: count ?? 0,
  };
}
