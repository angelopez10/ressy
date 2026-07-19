import 'server-only';

import { createClient } from '@/lib/db/server';
import type { ServiceDraft } from './schema';

/** Un día del horario en el borrador. `startTime`/`endTime` son hora local del negocio. */
export interface DraftDay {
  weekday: number; // 1=lunes … 7=domingo
  open: boolean;
  startTime: string;
  endTime: string;
}

export interface OnboardingDraft {
  businessId: string | null;
  /** Paso al que se debe retomar (1–4; 5 solo tras publicar). */
  resumeStep: number;
  basics: {
    name: string;
    ownerName: string;
    category: string | null;
    timezone: string;
    currency: string;
  } | null;
  services: ServiceDraft[];
  days: DraftDay[];
  page: {
    slug: string;
    accentColor: string;
    bookingLocale: 'es' | 'en';
    logoUrl: string | null;
  } | null;
  isPublished: boolean;
}

/** Horario por defecto para el paso 3: Lun–Vie 09:00–18:00, fin de semana cerrado. */
function defaultDays(): DraftDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const weekday = i + 1;
    const weekend = weekday >= 6;
    return {
      weekday,
      open: !weekend,
      startTime: '09:00',
      endTime: '18:00',
    };
  });
}

/**
 * Carga el borrador del onboarding del usuario y decide a qué paso retomar. La
 * DB es el borrador: cada paso escribió lo suyo, así que refrescar no pierde nada.
 */
export async function loadOnboardingDraft(): Promise<OnboardingDraft> {
  const db = await createClient();

  const { data: business } = await db
    .from('businesses')
    .select(
      'id, name, category, timezone, currency, slug, accent_color, logo_url, booking_locale, is_published',
    )
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!business) {
    return {
      businessId: null,
      resumeStep: 1,
      basics: null,
      services: [],
      days: defaultDays(),
      page: null,
      isPublished: false,
    };
  }

  const { data: authData } = await db.auth.getUser();
  const uid = authData.user?.id;

  const [ownerRes, servicesRes, hoursRes] = await Promise.all([
    db
      .from('staff_members')
      .select('name')
      .eq('business_id', business.id)
      .eq('user_id', uid ?? '')
      .limit(1)
      .maybeSingle(),
    db
      .from('services')
      .select('id, name, duration_min, price_amount, buffer_after_min')
      .eq('business_id', business.id)
      .order('sort_order', { ascending: true }),
    db
      .from('business_hours')
      .select('weekday, open_time, close_time')
      .eq('business_id', business.id),
  ]);

  const services: ServiceDraft[] = (servicesRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.duration_min,
    priceAmount: s.price_amount,
    bufferAfterMin: s.buffer_after_min,
  }));

  // Reconstruye los 7 días: los que tienen fila en business_hours van "abiertos".
  const byWeekday = new Map((hoursRes.data ?? []).map((h) => [h.weekday, h] as const));
  const days: DraftDay[] = defaultDays().map((d) => {
    const row = byWeekday.get(d.weekday);
    return row
      ? {
          weekday: d.weekday,
          open: true,
          startTime: row.open_time.slice(0, 5),
          endTime: row.close_time.slice(0, 5),
        }
      : { ...d, open: false };
  });

  // Resume: servicios vacíos → paso 2; sin horario → paso 3; si no, paso 4.
  let resumeStep = 4;
  if (services.length === 0) resumeStep = 2;
  else if ((hoursRes.data ?? []).length === 0) resumeStep = 3;

  return {
    businessId: business.id,
    resumeStep,
    basics: {
      name: business.name,
      ownerName: ownerRes.data?.name ?? '',
      category: business.category,
      timezone: business.timezone,
      currency: business.currency,
    },
    services,
    days: (hoursRes.data ?? []).length === 0 ? defaultDays() : days,
    page: {
      slug: business.slug,
      accentColor: business.accent_color ?? '#348D83',
      bookingLocale: business.booking_locale === 'en' ? 'en' : 'es',
      logoUrl: business.logo_url,
    },
    isPublished: business.is_published,
  };
}
