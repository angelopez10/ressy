import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { createClient } from '@/lib/db/server';
import { parseBookingSource } from '@/lib/booking/schema';
import { summarizeBusinessHours } from '@/lib/booking/format';
import type { BookingBundle } from '@/lib/booking/types';
import type { Locale } from '@/lib/i18n/routing';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ src?: string }>;
};

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
  const { src } = await searchParams;
  setRequestLocale(locale);

  const bundle = await loadBundle(slug, locale);
  if (!bundle) notFound();

  return <BookingFlow bundle={bundle} locale={locale} source={parseBookingSource(src)} />;
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
