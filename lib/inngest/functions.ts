import { createServiceClient } from '@/lib/db/service';
import {
  dispatchClientNotification,
  dispatchBusinessNotification,
  dispatchDailySummary,
} from '@/lib/notifications/dispatch';
import { getSettings } from '@/lib/notifications/data';
import { computeReminderSchedule } from '@/lib/notifications/schedule';
import { inngest } from './client';

/**
 * Confirmación inmediata al crear la reserva: al cliente + aviso al negocio.
 * Cada `step.run` reintenta de forma independiente si falla.
 */
export const sendConfirmation = inngest.createFunction(
  { id: 'send-confirmation', retries: 3, triggers: [{ event: 'booking/created' }] },
  async ({ event, step }) => {
    const { bookingId } = event.data as { bookingId: string };
    await step.run('client-confirmation', () =>
      dispatchClientNotification({ bookingId, type: 'confirmation' }),
    );
    await step.run('business-new-booking', () =>
      dispatchBusinessNotification({ bookingId, type: 'business_new_booking' }),
    );
  },
);

/**
 * Recordatorios programados (T-24h, T-2h configurables). `cancelOn` mata los
 * sleeps pendientes si la reserva se cancela o reagenda ⇒ no salen recordatorios
 * fantasma. Además `dispatchClientNotification` RE-VALIDA la reserva justo antes
 * de enviar (red de seguridad). Se re-arma en 'booking/reminders' tras reagendar.
 */
export const bookingReminders = inngest.createFunction(
  {
    id: 'booking-reminders',
    retries: 3,
    triggers: [{ event: 'booking/created' }, { event: 'booking/reminders' }],
    cancelOn: [
      { event: 'booking/cancelled', match: 'data.bookingId' },
      { event: 'booking/rescheduled', match: 'data.bookingId' },
    ],
  },
  async ({ event, step }) => {
    const { bookingId } = event.data as { bookingId: string };

    // Lee starts_at + settings como JSON plano (serializable entre steps).
    const plan = await step.run('load-schedule', async () => {
      const db = createServiceClient();
      const { data: b } = await db
        .from('bookings')
        .select('starts_at, status, business_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!b || !['pending_payment', 'confirmed', 'rescheduled'].includes(b.status)) return null;
      const s = await getSettings(db, b.business_id);
      return {
        startsAtIso: b.starts_at,
        reminder1Enabled: s.reminder1Enabled,
        reminder1Hours: s.reminder1Hours,
        reminder2Enabled: s.reminder2Enabled,
        reminder2Hours: s.reminder2Hours,
      };
    });
    if (!plan) return;

    const schedule = computeReminderSchedule(new Date(plan.startsAtIso), plan);
    for (const reminder of schedule) {
      await step.sleepUntil(`wait-${reminder.key}`, reminder.fireAt);
      await step.run(`send-${reminder.key}`, () =>
        dispatchClientNotification({ bookingId, type: 'reminder', dedupKey: `${bookingId}:${reminder.key}` }),
      );
    }
  },
);

/** Reserva reagendada: aviso al cliente + re-arma los recordatorios con la nueva hora. */
export const onRescheduled = inngest.createFunction(
  { id: 'on-rescheduled', retries: 3, triggers: [{ event: 'booking/rescheduled' }] },
  async ({ event, step }) => {
    const { bookingId } = event.data as { bookingId: string };
    await step.run('client-rescheduled', () =>
      dispatchClientNotification({ bookingId, type: 'rescheduled' }),
    );
    // Los recordatorios viejos ya murieron por cancelOn; re-arma con la nueva hora.
    await step.sendEvent('rearm-reminders', { name: 'booking/reminders', data: { bookingId } });
  },
);

/** Reserva cancelada: aviso al cliente + aviso al negocio. */
export const onCancelled = inngest.createFunction(
  { id: 'on-cancelled', retries: 3, triggers: [{ event: 'booking/cancelled' }] },
  async ({ event, step }) => {
    const { bookingId } = event.data as { bookingId: string };
    await step.run('client-cancelled', () =>
      dispatchClientNotification({ bookingId, type: 'cancelled' }),
    );
    await step.run('business-cancellation', () =>
      dispatchBusinessNotification({ bookingId, type: 'business_cancellation' }),
    );
  },
);

/**
 * Resumen diario. Cron horario: envía a cada negocio cuya hora local configurada
 * coincide con la hora actual y tiene el resumen activo. La idempotencia
 * (`{businessId}:daily:{fecha}`) impide duplicados aunque el cron se solape.
 */
export const dailySummary = inngest.createFunction(
  { id: 'daily-summary', triggers: [{ cron: '0 * * * *' }] },
  async ({ step }) => {
    const due = await step.run('find-due-businesses', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('notification_settings')
        .select('business_id, daily_summary_hour, businesses(timezone)')
        .eq('daily_summary_enabled', true);
      const nowUtc = new Date();
      return (
        (data as unknown as { business_id: string; daily_summary_hour: number; businesses: { timezone: string } | null }[] | null) ?? []
      )
        .filter((row) => {
          const tz = row.businesses?.timezone ?? 'UTC';
          const localHour = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(nowUtc);
          return Number(localHour) === row.daily_summary_hour;
        })
        .map((row) => row.business_id);
    });

    for (const businessId of due) {
      await step.run(`summary-${businessId}`, () => dispatchDailySummary(businessId));
    }
  },
);

/**
 * (PREPARADO, NO ACTIVADO) Post-servicio: agradecimiento + "reservar de nuevo".
 * Las reviews son de otra fase. Para activarlo: emitir 'booking/completed' al
 * completar una reserva (ya se emite) y añadir esta función al array `functions`.
 */
export const postServiceThankYou = inngest.createFunction(
  { id: 'post-service-thankyou', retries: 2, triggers: [{ event: 'booking/completed' }] },
  async ({ event, step }) => {
    const ENABLED = false; // deshabilitado a propósito en esta sesión
    if (!ENABLED) return;
    await step.sleep('wait-after-service', '2h');
    await step.run('client-post-service', () =>
      dispatchClientNotification({ bookingId: (event.data as { bookingId: string }).bookingId, type: 'post_service' }),
    );
  },
);

/** Funciones registradas en el endpoint. `postServiceThankYou` queda fuera (preparada). */
export const functions = [
  sendConfirmation,
  bookingReminders,
  onRescheduled,
  onCancelled,
  dailySummary,
];
