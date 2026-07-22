import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { BookingUnavailable } from '@/components/booking/BookingUnavailable';
import { BookingFooter } from '@/components/booking/BookingFooter';
import { PaymentReturn, type PaymentReturnStatus } from '@/components/booking/PaymentReturn';
import { createClient } from '@/lib/db/server';
import { parseBookingSource } from '@/lib/booking/schema';
import { summarizeBusinessHours } from '@/lib/booking/format';
import type { BookingBundle } from '@/lib/booking/types';
import type { Locale } from '@/lib/i18n/routing';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ src?: string; payment?: string }>;
};

const PAYMENT_STATES: PaymentReturnStatus[] = ['success', 'pending', 'failure'];

/**
 * Booking page pública (`getressy.com/{slug}`). El shell del negocio y su
 * catálogo se cargan en el servidor (SSR, indexable); los pasos interactivos los
 * maneja `<BookingFlow>` en el cliente, pidiendo slots vía server action.
 *
 * Todo lo que se lee aquí es público para negocios publicados (RLS de anon,
 * migración 06). Cero PII de clientes.
 */
export default async function BookingPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { src, payment } = await searchParams;
  setRequestLocale(locale);

  const bundle = await loadBundle(slug, locale);
  if (!bundle) notFound();

  const db = await createClient();

  // ¿Mostrar la marca "Powered by Ressy"? Solo el plan Free la muestra; los pagos
  // la quitan (feature poweredByRessy). Boolean neutro vía RPC SECURITY DEFINER:
  // el anon nunca ve el tier. Ante error (null), por defecto SÍ se muestra.
  const { data: showBranding } = await db.rpc('business_shows_branding', {
    p_business_id: bundle.business.id,
  });
  const branded = showBranding !== false;
  const footer = branded ? <BookingFooter /> : null;

  // Vuelta desde el checkout de MP. La confirmación real la decide el webhook;
  // esta pantalla solo informa (success = "confirmando", no "confirmado").
  if (payment && PAYMENT_STATES.includes(payment as PaymentReturnStatus)) {
    return (
      <>
        <div className="flex-1">
          <PaymentReturn business={bundle.business} status={payment as PaymentReturnStatus} />
        </div>
        {footer}
      </>
    );
  }

  // ¿El negocio acepta reservas online? (topa el plan Free en 25/mes). Si no,
  // mostramos un estado neutro y digno — jamás un error técnico (CLAUDE.md).
  const { data: accepting } = await db.rpc('business_accepting_bookings', {
    p_business_id: bundle.business.id,
  });
  if (accepting === false) {
    return (
      <>
        <div className="flex-1">
          <BookingUnavailable business={bundle.business} />
        </div>
        {footer}
      </>
    );
  }

  return (
    <>
      <div className="flex-1">
        <BookingFlow bundle={bundle} locale={locale} source={parseBookingSource(src)} />
      </div>
      {footer}
    </>
  );
}

async function loadBundle(slug: string, locale: string): Promise<BookingBundle | null> {
  const db = await createClient();

  const { data: business } = await db
    .from('businesses')
    .select('id, slug, name, category, timezone, currency, accent_color, logo_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!business) return null;

  const [servicesRes, staffRes, serviceStaffRes, policiesRes, hoursRes] = await Promise.all([
    db
      .from('services')
      .select(
        'id, name, description, duration_min, price_amount, buffer_before_min, buffer_after_min',
      )
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    db
      .from('staff_members')
      .select('id, name, role, avatar_url, sort_order')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    db.from('service_staff').select('service_id, staff_member_id').eq('business_id', business.id),
    db
      .from('business_policies')
      .select(
        'deposit_type, deposit_percent, deposit_amount, cancellation_window_hours, min_lead_time_min, max_advance_days',
      )
      .eq('business_id', business.id)
      .maybeSingle(),
    db
      .from('business_hours')
      .select('weekday, open_time, close_time')
      .eq('business_id', business.id),
  ]);

  const staffOrder = new Map((staffRes.data ?? []).map((s, i) => [s.id, i] as const));
  const serviceStaff: Record<string, string[]> = {};
  for (const row of serviceStaffRes.data ?? []) {
    (serviceStaff[row.service_id] ??= []).push(row.staff_member_id);
  }
  // Ordena cada lista por el sort_order del staff (el mismo del bundle).
  for (const ids of Object.values(serviceStaff)) {
    ids.sort((a, b) => (staffOrder.get(a) ?? 0) - (staffOrder.get(b) ?? 0));
  }

  return {
    business: {
      id: business.id,
      slug: business.slug,
      name: business.name,
      category: business.category,
      timezone: business.timezone,
      currency: business.currency,
      accentColor: business.accent_color,
      logoUrl: business.logo_url,
      hoursSummary: summarizeBusinessHours(
        (hoursRes.data ?? []).map((h) => ({
          weekday: h.weekday,
          openTime: h.open_time,
          closeTime: h.close_time,
        })),
        locale,
      ),
    },
    policies: {
      depositType: policiesRes.data?.deposit_type ?? 'none',
      depositPercent: policiesRes.data?.deposit_percent ?? null,
      depositAmount: policiesRes.data?.deposit_amount ?? null,
      cancellationWindowHours: policiesRes.data?.cancellation_window_hours ?? 24,
      minLeadTimeMin: policiesRes.data?.min_lead_time_min ?? 0,
      maxAdvanceDays: policiesRes.data?.max_advance_days ?? 60,
    },
    services: (servicesRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.duration_min,
      priceAmount: s.price_amount,
      bufferBeforeMin: s.buffer_before_min,
      bufferAfterMin: s.buffer_after_min,
    })),
    staff: (staffRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      avatarUrl: s.avatar_url,
    })),
    serviceStaff,
  };
}
