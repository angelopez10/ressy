import 'server-only';

/**
 * Carga de datos para las notificaciones, con el service client (los jobs corren
 * fuera de sesión). Reúne todo lo que render/dispatch necesitan de una reserva.
 */

import type { ServiceClient } from '@/lib/db/service';
import type { Enums } from '@/lib/db/types';
import type { NotifLocale } from './copy';

export interface NotificationSettings {
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
  customMessage: string | null;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
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
  customMessage: null,
};

export interface BookingNotifCtx {
  booking: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: Enums<'booking_status'>;
    priceAmount: number;
    currency: string;
    note: string | null;
    managementToken: string;
  };
  service: { name: string; durationMin: number };
  staff: { name: string };
  customer: { fullName: string; email: string | null; phone: string | null; locale: NotifLocale };
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    tier: Enums<'subscription_tier'>;
    address: string | null;
    logoUrl: string | null;
    accentColor: string | null;
  };
  settings: NotificationSettings;
}

export async function getSettings(
  db: ServiceClient,
  businessId: string,
): Promise<NotificationSettings> {
  const { data } = await db
    .from('notification_settings')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
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
    customMessage: data.custom_message,
  };
}

export async function loadBookingContext(
  db: ServiceClient,
  bookingId: string,
): Promise<BookingNotifCtx | null> {
  const { data: b, error: bErr } = await db
    .from('bookings')
    .select(
      'id, starts_at, ends_at, status, price_amount, currency, notes, management_token, business_id, service_id, staff_member_id, customer_id',
    )
    .eq('id', bookingId)
    .maybeSingle();
  // Distinguir un ERROR de lectura (transitorio ⇒ lanzar para que Inngest
  // reintente) de una reserva genuinamente inexistente (⇒ null, se salta sin
  // reintentar). Sin esto, un fallo transitorio se traga la notificación en
  // silencio — el bug de cold-start de la sesión 08.
  if (bErr) throw new Error(`notif: fallo leyendo booking ${bookingId}: ${bErr.message}`);
  if (!b) return null;

  const [svcRes, staffRes, custRes, bizRes, subRes] = await Promise.all([
    db.from('services').select('name, duration_min').eq('id', b.service_id).maybeSingle(),
    db.from('staff_members').select('name').eq('id', b.staff_member_id).maybeSingle(),
    db.from('customers').select('full_name, email, phone, locale').eq('id', b.customer_id).maybeSingle(),
    db
      .from('businesses')
      .select('id, name, slug, timezone, currency, address, logo_url, accent_color')
      .eq('id', b.business_id)
      .maybeSingle(),
    db.from('subscriptions').select('tier').eq('business_id', b.business_id).maybeSingle(),
  ]);
  // Cualquier lectura relacionada que ERRORE ⇒ lanzar (reintento), no seguir con
  // datos parciales que podrían saltar el canal (p.ej. customer sin email).
  for (const res of [svcRes, staffRes, custRes, bizRes, subRes]) {
    if (res.error) throw new Error(`notif: fallo leyendo datos de la reserva: ${res.error.message}`);
  }
  const service = svcRes.data;
  const staff = staffRes.data;
  const customer = custRes.data;
  const business = bizRes.data;
  const sub = subRes.data;
  if (!business) return null;

  const settings = await getSettings(db, b.business_id);

  return {
    booking: {
      id: b.id,
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
      status: b.status,
      priceAmount: b.price_amount,
      currency: b.currency,
      note: b.notes,
      managementToken: b.management_token,
    },
    service: { name: service?.name ?? '—', durationMin: service?.duration_min ?? 30 },
    staff: { name: staff?.name ?? '—' },
    customer: {
      fullName: customer?.full_name ?? '',
      email: customer?.email ?? null,
      phone: customer?.phone ?? null,
      locale: customer?.locale === 'en' ? 'en' : 'es',
    },
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      currency: business.currency,
      tier: sub?.tier ?? 'free',
      address: business.address,
      logoUrl: business.logo_url,
      accentColor: business.accent_color,
    },
    settings,
  };
}

/** Email del OWNER del negocio (para notificaciones al negocio). */
export async function loadOwnerEmail(db: ServiceClient, businessId: string): Promise<string | null> {
  const { data: member, error } = await db
    .from('business_members')
    .select('user_id')
    .eq('business_id', businessId)
    .eq('role', 'owner')
    .maybeSingle();
  if (error) throw new Error(`notif: fallo leyendo owner de ${businessId}: ${error.message}`);
  if (!member) return null;
  const { data, error: authErr } = await db.auth.admin.getUserById(member.user_id);
  if (authErr) throw new Error(`notif: fallo resolviendo email del owner: ${authErr.message}`);
  return data.user?.email ?? null;
}

export interface AgendaItem {
  startsAt: Date;
  customerName: string;
  serviceName: string;
}

/** Agenda de un rango (para el resumen diario), en estados vivos. */
export async function loadAgenda(
  db: ServiceClient,
  businessId: string,
  fromIso: string,
  toIso: string,
): Promise<AgendaItem[]> {
  const { data } = await db
    .from('bookings')
    .select('starts_at, services(name), customers(full_name)')
    .eq('business_id', businessId)
    .in('status', ['pending_payment', 'confirmed', 'rescheduled'])
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso)
    .order('starts_at', { ascending: true });

  return (
    (data as unknown as { starts_at: string; services: { name: string } | null; customers: { full_name: string } | null }[] | null) ??
    []
  ).map((r) => ({
    startsAt: new Date(r.starts_at),
    customerName: r.customers?.full_name ?? '—',
    serviceName: r.services?.name ?? '—',
  }));
}
