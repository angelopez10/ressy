import { createServiceClient } from '@/lib/db/service';
import {
  dispatchClientNotification,
  dispatchBusinessNotification,
  dispatchDailySummary,
  dispatchTrialEmail,
} from '@/lib/notifications/dispatch';
import { getSettings } from '@/lib/notifications/data';
import { computeReminderSchedule } from '@/lib/notifications/schedule';
import { trialDaysLeft } from '@/lib/plans/status';
import { TRIAL_DAYS, TRIAL_NUDGE_DAYS } from '@/lib/plans/config';
import { trackServer, commonPropsFor } from '@/lib/analytics/server';
import { getValidAccessToken } from '@/lib/payments/mercadopago/account';
import { planPriceTable } from '@/lib/admin/pricing';
import { getUsdPerClp } from '@/lib/admin/env';
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

/**
 * Ciclo del trial de 14 días (CLAUDE.md §Prompt 09). Cron diario:
 *   1. Avisos: email al DÍA 11 (quedan 3) y al DÍA 14 (venció hoy). Idempotentes.
 *   2. Downgrade: los trials vencidos bajan a Free (RPC que RE-VALIDA el estado
 *      real al ejecutar). Se hace DESPUÉS de los emails para no perder el aviso
 *      del día 14 (el downgrade apaga is_trial).
 */
export const trialLifecycle = inngest.createFunction(
  { id: 'trial-lifecycle', retries: 2, triggers: [{ cron: '0 8 * * *' }] },
  async ({ step }) => {
    const due = await step.run('find-trials', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('subscriptions')
        .select('business_id, trial_ends_at')
        .eq('is_trial', true);
      const now = new Date();
      return (data ?? [])
        .map((s) => ({ businessId: s.business_id, daysLeft: trialDaysLeft(s.trial_ends_at, now) }))
        .map((s) => {
          // Día 11 = quedan TRIAL_NUDGE_DAYS (3). Día 14 = venció (0).
          if (s.daysLeft === TRIAL_NUDGE_DAYS) return { ...s, day: TRIAL_DAYS - TRIAL_NUDGE_DAYS };
          if (s.daysLeft <= 0) return { ...s, day: TRIAL_DAYS };
          return null;
        })
        .filter((s): s is { businessId: string; daysLeft: number; day: number } => s !== null);
    });

    for (const t of due) {
      await step.run(`trial-email-${t.businessId}-${t.day}`, () =>
        dispatchTrialEmail({ businessId: t.businessId, day: t.day, daysLeft: t.daysLeft }),
      );
      // Analytics del ciclo de trial. Idempotente como el email: el cron corre
      // una vez al día y solo casa el día 11 / 14 exacto.
      await step.run(`trial-analytics-${t.businessId}-${t.day}`, async () => {
        const db = createServiceClient();
        const common = await commonPropsFor(db, t.businessId);
        if (t.day === TRIAL_DAYS - TRIAL_NUDGE_DAYS) {
          await trackServer('trial_ending_soon', t.businessId, common);
        } else if (t.day === TRIAL_DAYS) {
          await trackServer('trial_ended', t.businessId, common);
        }
        return 'ok';
      });
    }

    // Downgrade de los vencidos (idempotente: un segundo pase no hace nada).
    await step.run('downgrade-expired', async () => {
      const db = createServiceClient();
      const { data } = await db.rpc('trial_expire_downgrade');
      return data ?? 0;
    });
  },
);

/**
 * Expira los holds de pago vencidos (anticipos, sesión 10B). Cron frecuente:
 * las reservas en `pending_payment` cuyo `payment_expires_at` ya pasó se marcan
 * `payment_expired` y LIBERAN el slot (la constraint de exclusión deja de
 * bloquearlas). Bulk + idempotente.
 */
export const expirePaymentHolds = inngest.createFunction(
  { id: 'expire-payment-holds', triggers: [{ cron: '*/3 * * * *' }] },
  async ({ step }) => {
    await step.run('expire', async () => {
      const db = createServiceClient();
      const { data } = await db.rpc('expire_pending_payments');
      return data ?? 0;
    });
  },
);

/**
 * Refresco proactivo de los tokens OAuth de Mercado Pago (sesión 10B). Los
 * access token duran ~180 días; renovamos con margen. `getValidAccessToken`
 * refresca si está por expirar y, si el refresh falla, marca la cuenta en
 * `error` (el dashboard avisa al negocio que reconecte). Cron diario.
 */
export const refreshMpTokens = inngest.createFunction(
  { id: 'refresh-mp-tokens', triggers: [{ cron: '0 6 * * *' }] },
  async ({ step }) => {
    const businessIds = await step.run('find-connected', async () => {
      const db = createServiceClient();
      const { data } = await db
        .from('mp_oauth_accounts')
        .select('business_id')
        .eq('status', 'connected');
      return (data ?? []).map((r) => r.business_id);
    });

    for (const businessId of businessIds) {
      // Cada negocio en su step: un fallo de refresh (ya marca error dentro) no
      // corta a los demás.
      await step.run(`refresh-${businessId}`, async () => {
        const db = createServiceClient();
        try {
          await getValidAccessToken(db, businessId);
          return 'ok';
        } catch {
          return 'error'; // getValidAccessToken ya dejó la cuenta en 'error'
        }
      });
    }
  },
);

/**
 * Baja a Free las suscripciones canceladas cuyo período pagado ya venció
 * (Mercado Pago, sesión de billing). Hermano de `trialLifecycle`: la RPC
 * `subscription_expire_downgrade` RE-VALIDA el estado real al ejecutar (solo
 * toca `cancel_at_period_end` con `current_period_end` pasado) y es idempotente,
 * así que un segundo pase no hace nada. Cron diario.
 */
export const subscriptionLifecycle = inngest.createFunction(
  { id: 'subscription-lifecycle', retries: 2, triggers: [{ cron: '30 8 * * *' }] },
  async ({ step }) => {
    await step.run('downgrade-expired', async () => {
      const db = createServiceClient();
      const { data } = await db.rpc('subscription_expire_downgrade');
      return data ?? 0;
    });
  },
);

/**
 * Foto diaria del MRR para el panel de admin.
 *
 * Existe porque el MRR histórico NO se puede reconstruir con exactitud desde
 * `subscriptions`: la tabla guarda el plan de HOY, no el que tenía cada negocio
 * en cada fecha. Sin snapshots, un gráfico de "MRR en el tiempo" sería una
 * estimación disfrazada de dato duro — inaceptable para una métrica de dinero.
 *
 * Los importes salen de `lib/plans/config.ts` (fuente de verdad única), igual
 * que en el resto del panel. Idempotente por la PK del día: si el cron corre
 * dos veces, la segunda pisa con el mismo valor.
 */
export const mrrSnapshot = inngest.createFunction(
  { id: 'mrr-snapshot', retries: 2, triggers: [{ cron: '0 4 * * *' }] },
  async ({ step }) => {
    return step.run('snapshot', async () => {
      const db = createServiceClient();

      const { data: rows } = await db
        .from('subscriptions')
        .select('business_id, tier, status, is_trial, businesses!inner(currency, suspended_at)');

      const prices = planPriceTable();
      const usdPerClp = getUsdPerClp();

      let usd = 0;
      let clp = 0;
      let paying = 0;
      let trialing = 0;
      let active = 0;
      const byTier: Record<string, number> = {};

      for (const row of (rows ?? []) as unknown as {
        tier: string;
        status: string;
        is_trial: boolean;
        businesses: { currency: string; suspended_at: string | null };
      }[]) {
        // Las cuentas suspendidas no aportan MRR: su booking page está caída.
        if (row.businesses?.suspended_at) continue;
        active += 1;
        if (row.is_trial) trialing += 1;

        const isClp = (row.businesses?.currency ?? '').toLowerCase() === 'clp';
        const amount =
          row.tier === 'free' || row.is_trial || !['active', 'past_due'].includes(row.status)
            ? 0
            : ((isClp ? prices[row.tier]?.clp : prices[row.tier]?.usd) ?? 0);

        if (amount > 0) {
          paying += 1;
          byTier[row.tier] = (byTier[row.tier] ?? 0) + 1;
          if (isClp) clp += amount;
          else usd += amount;
        }
      }

      // Se guarda en la unidad MENOR (CLAUDE.md §3). CLP no tiene decimales.
      const day = new Date().toISOString().slice(0, 10);
      const { error } = await db.from('mrr_daily_snapshots').upsert(
        {
          day,
          mrr_usd_cents: Math.round(usd * 100),
          mrr_clp_cents: Math.round(clp),
          mrr_total_usd_cents: Math.round((usd + clp * usdPerClp) * 100),
          usd_per_clp: usdPerClp,
          active_businesses: active,
          paying_businesses: paying,
          trialing_businesses: trialing,
          by_tier: byTier,
        },
        { onConflict: 'day' },
      );
      if (error) {
        // Nunca en silencio: sin esto el gráfico del panel queda con un hueco
        // que nadie va a poder reconstruir después.
        console.error('[mrr-snapshot] no se pudo guardar el snapshot', { day, error: error.message });
        throw new Error(error.message);
      }

      return { day, paying, active };
    });
  },
);

/** Funciones registradas en el endpoint. `postServiceThankYou` queda fuera (preparada). */
export const functions = [
  sendConfirmation,
  bookingReminders,
  onRescheduled,
  onCancelled,
  dailySummary,
  trialLifecycle,
  expirePaymentHolds,
  refreshMpTokens,
  subscriptionLifecycle,
  mrrSnapshot,
];
