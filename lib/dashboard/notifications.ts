import 'server-only';

/** Lectura de las preferencias de notificaciones para la tab de Ajustes. */

import { getTenantDb } from './tenant';

export interface NotifSettingsDTO {
  confirmationEnabled: boolean;
  reminder1Enabled: boolean;
  reminder1Hours: number;
  reminder2Enabled: boolean;
  reminder2Hours: number;
  rescheduledEnabled: boolean;
  cancelledEnabled: boolean;
  businessNewBookingEnabled: boolean;
  businessCancellationEnabled: boolean;
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
  whatsappEnabled: boolean;
  customMessage: string;
}

export const NOTIF_DEFAULTS: NotifSettingsDTO = {
  confirmationEnabled: true,
  reminder1Enabled: true,
  reminder1Hours: 24,
  reminder2Enabled: true,
  reminder2Hours: 2,
  rescheduledEnabled: true,
  cancelledEnabled: true,
  businessNewBookingEnabled: true,
  businessCancellationEnabled: true,
  dailySummaryEnabled: false,
  dailySummaryHour: 8,
  whatsappEnabled: true,
  customMessage: '',
};

export async function getNotifSettings(businessId: string): Promise<NotifSettingsDTO> {
  const db = await getTenantDb();
  const { data } = await db
    .from('notification_settings')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return NOTIF_DEFAULTS;
  return {
    confirmationEnabled: data.confirmation_enabled,
    reminder1Enabled: data.reminder_1_enabled,
    reminder1Hours: data.reminder_1_hours,
    reminder2Enabled: data.reminder_2_enabled,
    reminder2Hours: data.reminder_2_hours,
    rescheduledEnabled: data.rescheduled_enabled,
    cancelledEnabled: data.cancelled_enabled,
    businessNewBookingEnabled: data.business_new_booking_enabled,
    businessCancellationEnabled: data.business_cancellation_enabled,
    dailySummaryEnabled: data.daily_summary_enabled,
    dailySummaryHour: data.daily_summary_hour,
    whatsappEnabled: data.whatsapp_enabled,
    customMessage: data.custom_message ?? '',
  };
}
