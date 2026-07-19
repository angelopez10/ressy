'use server';

/** Guarda las preferencias de notificaciones. RLS `admins manage notification settings`. */

import { z } from 'zod';
import { createClient } from '@/lib/db/server';
import { getDashboardContext } from './context';

export type NotifSettingsResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  confirmationEnabled: z.boolean(),
  reminder1Enabled: z.boolean(),
  reminder1Hours: z.coerce.number().int().min(0).max(8760),
  reminder2Enabled: z.boolean(),
  reminder2Hours: z.coerce.number().int().min(0).max(8760),
  rescheduledEnabled: z.boolean(),
  cancelledEnabled: z.boolean(),
  businessNewBookingEnabled: z.boolean(),
  businessCancellationEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean(),
  dailySummaryHour: z.coerce.number().int().min(0).max(23),
  whatsappEnabled: z.boolean(),
  customMessage: z.string().trim().max(280),
});

export async function saveNotificationSettings(raw: unknown): Promise<NotifSettingsResult> {
  const ctx = await getDashboardContext();
  if (!ctx || (ctx.role !== 'owner' && ctx.role !== 'admin')) return { ok: false, error: 'notAuthorized' };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const d = parsed.data;
  const db = await createClient();

  const { error } = await db.from('notification_settings').upsert({
    business_id: ctx.business.id,
    confirmation_enabled: d.confirmationEnabled,
    reminder_1_enabled: d.reminder1Enabled,
    reminder_1_hours: d.reminder1Hours,
    reminder_2_enabled: d.reminder2Enabled,
    reminder_2_hours: d.reminder2Hours,
    rescheduled_enabled: d.rescheduledEnabled,
    cancelled_enabled: d.cancelledEnabled,
    business_new_booking_enabled: d.businessNewBookingEnabled,
    business_cancellation_enabled: d.businessCancellationEnabled,
    daily_summary_enabled: d.dailySummaryEnabled,
    daily_summary_hour: d.dailySummaryHour,
    whatsapp_enabled: d.whatsappEnabled,
    custom_message: d.customMessage || null,
  });
  if (error) return { ok: false, error: 'generic' };
  return { ok: true };
}
