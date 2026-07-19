import 'server-only';

/**
 * El orquestador de envíos — el corazón de la fiabilidad (CLAUDE.md: "un
 * recordatorio que no llega es peor que no prometerlo"). Garantiza:
 *
 *   1. IDEMPOTENCIA — `notifications.dedup_key` UNIQUE: si ya se envió, no reenvía.
 *   2. VALIDAR ANTES DE ENVIAR — recarga la reserva FRESCA y, para
 *      confirmación/recordatorio, la salta si ya no está viva (cancelada/no-show).
 *      Es la red de seguridad contra "recordatorios fantasma".
 *   3. LÍMITE POR PLAN — Free = solo email; pagos = email + WhatsApp.
 *   4. FALLBACK — si WhatsApp falla, cae a email. Nunca deja al cliente sin nada.
 *   5. USO — cuenta los envíos de canales pagos por negocio/mes.
 */

import { DateTime } from 'luxon';
import { createServiceClient, type ServiceClient } from '@/lib/db/service';
import { defaultChannels } from './channels';
import { buildBusinessMessage, buildClientMessage, buildDailySummaryMessage } from './render';
import { loadBookingContext, loadOwnerEmail, loadAgenda, getSettings, type BookingNotifCtx } from './data';
import type { Channel, ChannelRegistry, NotificationType, SendResult } from './types';

const PAID_CHANNELS: Channel[] = ['whatsapp', 'sms'];
const LIVE = new Set(['pending_payment', 'confirmed', 'rescheduled']);

export interface DispatchDeps {
  db: ServiceClient;
  channels: ChannelRegistry;
}

function deps(overrides?: Partial<DispatchDeps>): DispatchDeps {
  return {
    db: overrides?.db ?? createServiceClient(),
    channels: overrides?.channels ?? defaultChannels(),
  };
}

function period(now = new Date()): string {
  return DateTime.fromJSDate(now, { zone: 'utc' }).toFormat('yyyy-MM');
}

/**
 * Reserva un registro de notificación de forma idempotente.
 * - Inserta `pending` con el dedup_key. Si choca (ya existe): si está `sent`,
 *   devuelve skip; si no, permite reintento sobre la fila existente.
 */
async function reserve(
  db: ServiceClient,
  args: { businessId: string; bookingId: string | null; type: NotificationType; channel: Channel; recipient: string; dedupKey: string },
): Promise<{ skip: true } | { skip: false; id: string }> {
  const { data, error } = await db
    .from('notifications')
    .insert({
      business_id: args.businessId,
      booking_id: args.bookingId,
      type: args.type,
      channel: args.channel,
      status: 'pending',
      recipient: args.recipient,
      dedup_key: args.dedupKey,
    })
    .select('id')
    .single();

  if (!error && data) return { skip: false, id: data.id };

  // Solo un choque de UNIQUE (23505) significa "ya existe". Cualquier otro error
  // de insert es transitorio ⇒ lanzar para que Inngest reintente (nunca saltar
  // en silencio, que perdería la notificación — hardening de la sesión 08).
  if (error && error.code !== '23505') {
    throw new Error(`notif: fallo reservando ${args.dedupKey}: ${error.message}`);
  }

  // Conflicto de unicidad ⇒ ya existe. Revisa su estado.
  const { data: existing, error: selErr } = await db
    .from('notifications')
    .select('id, status')
    .eq('dedup_key', args.dedupKey)
    .maybeSingle();
  if (selErr) throw new Error(`notif: fallo leyendo dedup ${args.dedupKey}: ${selErr.message}`);
  if (!existing) throw new Error(`notif: conflicto sin fila para ${args.dedupKey}`); // inconsistente ⇒ reintentar
  if (existing.status === 'sent') return { skip: true };
  return { skip: false, id: existing.id };
}

async function finalize(
  db: ServiceClient,
  id: string,
  result: SendResult,
  channel: Channel,
  recipient: string,
  businessId: string,
) {
  if (result.ok) {
    await db
      .from('notifications')
      .update({ status: 'sent', channel, recipient, external_id: result.externalId ?? null, sent_at: new Date().toISOString() })
      .eq('id', id);
    if (PAID_CHANNELS.includes(channel)) {
      await db.rpc('increment_notification_usage', { p_business_id: businessId, p_period: period(), p_channel: channel });
    }
  } else {
    await db.from('notifications').update({ status: 'failed', error: result.error ?? 'unknown' }).eq('id', id);
  }
}

/** Canales del cliente, ordenados por preferencia, según plan + settings + config + contacto. */
function clientChannels(ctx: BookingNotifCtx, registry: ChannelRegistry): { channel: Channel; to: string }[] {
  const paidAllowed = ctx.business.tier !== 'free' && ctx.settings.whatsappEnabled;
  const out: { channel: Channel; to: string }[] = [];

  if (paidAllowed && ctx.customer.phone && registry.whatsapp?.isConfigured()) {
    out.push({ channel: 'whatsapp', to: ctx.customer.phone });
  }
  if (ctx.customer.email && registry.email?.isConfigured()) {
    out.push({ channel: 'email', to: ctx.customer.email }); // fallback siempre disponible
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export interface ClientDispatchArgs {
  bookingId: string;
  type: NotificationType;
  /** Idempotencia. Default `${bookingId}:${type}`; recordatorios pasan uno con el offset. */
  dedupKey?: string;
}

export async function dispatchClientNotification(
  args: ClientDispatchArgs,
  overrides?: Partial<DispatchDeps>,
): Promise<{ status: 'sent' | 'skipped' | 'failed'; channel?: Channel }> {
  const { db, channels } = deps(overrides);
  const ctx = await loadBookingContext(db, args.bookingId);
  if (!ctx) return { status: 'skipped' };

  // Gating por settings.
  const enabled: Record<string, boolean> = {
    confirmation: ctx.settings.confirmationEnabled,
    reminder: true, // ya filtrado al agendar
    rescheduled: ctx.settings.rescheduledEnabled,
    cancelled: ctx.settings.cancelledEnabled,
    post_service: true,
  };
  if (enabled[args.type] === false) return { status: 'skipped' };

  // VALIDAR ANTES DE ENVIAR: confirmación/recordatorio solo si la reserva sigue viva.
  if ((args.type === 'confirmation' || args.type === 'reminder') && !LIVE.has(ctx.booking.status)) {
    return { status: 'skipped' };
  }

  const ordered = clientChannels(ctx, channels);
  if (ordered.length === 0) return { status: 'skipped' };

  const dedupKey = args.dedupKey ?? `${args.bookingId}:${args.type}`;

  for (const { channel, to } of ordered) {
    const reserved = await reserve(db, {
      businessId: ctx.business.id,
      bookingId: ctx.booking.id,
      type: args.type,
      channel,
      recipient: to,
      dedupKey,
    });
    if (reserved.skip) return { status: 'skipped' }; // ya enviado antes

    const impl = channels[channel];
    if (!impl) continue;
    const message = buildClientMessage(args.type, channel, ctx, to);
    const result = await impl.send(message);
    await finalize(db, reserved.id, result, channel, to, ctx.business.id);
    if (result.ok) return { status: 'sent', channel };
    // Falló este canal → el loop intenta el siguiente (fallback a email).
  }

  return { status: 'failed', channel: undefined };
}

// ---------------------------------------------------------------------------
// Negocio
// ---------------------------------------------------------------------------

export async function dispatchBusinessNotification(
  args: { bookingId: string; type: 'business_new_booking' | 'business_cancellation' },
  overrides?: Partial<DispatchDeps>,
): Promise<{ status: 'sent' | 'skipped' | 'failed' }> {
  const { db, channels } = deps(overrides);
  const ctx = await loadBookingContext(db, args.bookingId);
  if (!ctx) return { status: 'skipped' };

  const on =
    args.type === 'business_new_booking'
      ? ctx.settings.businessNewBookingEnabled
      : ctx.settings.businessCancellationEnabled;
  if (!on) return { status: 'skipped' };

  const email = channels.email;
  if (!email?.isConfigured()) return { status: 'skipped' };
  const to = await loadOwnerEmail(db, ctx.business.id);
  if (!to) return { status: 'skipped' };

  const dedupKey = `${args.bookingId}:${args.type}`;
  const reserved = await reserve(db, {
    businessId: ctx.business.id,
    bookingId: ctx.booking.id,
    type: args.type,
    channel: 'email',
    recipient: to,
    dedupKey,
  });
  if (reserved.skip) return { status: 'skipped' };

  const message = buildBusinessMessage(args.type, ctx, to);
  const result = await email.send(message);
  await finalize(db, reserved.id, result, 'email', to, ctx.business.id);
  return { status: result.ok ? 'sent' : 'failed' };
}

// ---------------------------------------------------------------------------
// Resumen diario
// ---------------------------------------------------------------------------

export async function dispatchDailySummary(
  businessId: string,
  overrides?: Partial<DispatchDeps>,
): Promise<{ status: 'sent' | 'skipped' | 'failed' }> {
  const { db, channels } = deps(overrides);
  const settings = await getSettings(db, businessId);
  if (!settings.dailySummaryEnabled) return { status: 'skipped' };

  const { data: business } = await db
    .from('businesses')
    .select('name, logo_url, timezone, booking_locale')
    .eq('id', businessId)
    .maybeSingle();
  if (!business) return { status: 'skipped' };

  const email = channels.email;
  if (!email?.isConfigured()) return { status: 'skipped' };
  const to = await loadOwnerEmail(db, businessId);
  if (!to) return { status: 'skipped' };

  const tz = business.timezone;
  const day = DateTime.now().setZone(tz).startOf('day');
  const items = await loadAgenda(db, businessId, day.toUTC().toISO()!, day.plus({ days: 1 }).toUTC().toISO()!);
  const dateLabel = day.setLocale(business.booking_locale === 'en' ? 'en' : 'es').toLocaleString(DateTime.DATE_FULL);

  const dedupKey = `${businessId}:daily:${day.toISODate()}`;
  const reserved = await reserve(db, {
    businessId,
    bookingId: null,
    type: 'business_daily_summary',
    channel: 'email',
    recipient: to,
    dedupKey,
  });
  if (reserved.skip) return { status: 'skipped' };

  const message = buildDailySummaryMessage(
    { name: business.name, logoUrl: business.logo_url, timezone: tz, bookingLocale: business.booking_locale === 'en' ? 'en' : 'es' },
    items,
    to,
    dateLabel,
  );
  const result = await email.send(message);
  await finalize(db, reserved.id, result, 'email', to, businessId);
  return { status: result.ok ? 'sent' : 'failed' };
}
