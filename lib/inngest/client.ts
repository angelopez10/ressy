import { Inngest } from 'inngest';

/**
 * Cliente de Inngest. Motor de jobs de Ressy: eventos de reserva disparan las
 * notificaciones y los recordatorios programados (con reintentos automáticos).
 *
 * Eventos que emitimos (ver lib/inngest/emit.ts):
 *   booking/created · booking/rescheduled · booking/cancelled · booking/completed
 *   booking/reminders  (re-arma recordatorios tras un reagende)
 */
export const inngest = new Inngest({ id: 'ressy' });
