import { describe, expect, it } from 'vitest';
import { sanitize, isSanitized, ALLOWED_PROPERTY_KEYS } from './sanitize';
import type { AnalyticsEventMap } from './events';

describe('sanitize — el único filtro anti-PII', () => {
  it('descarta cualquier key fuera del allowlist (defensa estructural)', () => {
    const out = sanitize({
      business_id: 'biz_1',
      // PII que JAMÁS debe salir aunque un call site la pase por error:
      customer_email: 'ana@example.com',
      customer_phone: '+56 9 1234 5678',
      customer_name: 'Ana Pérez',
      crm_note: 'alérgica al tinte',
    });
    expect(out).toEqual({ business_id: 'biz_1' });
    expect(out).not.toHaveProperty('customer_email');
    expect(out).not.toHaveProperty('customer_phone');
    expect(out).not.toHaveProperty('customer_name');
    expect(out).not.toHaveProperty('crm_note');
  });

  it('descarta valores no primitivos (objetos/arrays podrían anidar PII)', () => {
    const out = sanitize({
      plan: 'team',
      // Aunque "plan" está permitida, un objeto no pasa.
      country: { code: 'CL', city: 'Santiago' } as unknown as string,
      extra: ['a', 'b'] as unknown as string,
    });
    expect(out).toEqual({ plan: 'team' });
  });

  it('descarta un valor allowlisted que "parezca" PII (email/teléfono)', () => {
    // "from" es una key permitida (upgrade_cta_clicked); si por bug llegara un
    // email, la heurística lo bloquea igual.
    const out = sanitize({ from: 'ana@example.com' });
    expect(out).toEqual({});
  });

  it('ignora undefined/null sin romper', () => {
    expect(sanitize(undefined)).toEqual({});
    expect(sanitize({ plan: undefined, locale: null as unknown as undefined })).toEqual({});
  });

  it('conserva primitivos permitidos tal cual', () => {
    const out = sanitize({ business_id: 'b', step: 3, with_deposit: true, plan: 'solo' });
    expect(out).toEqual({ business_id: 'b', step: 3, with_deposit: true, plan: 'solo' });
  });
});

describe('catálogo ⊆ allowlist — ningún evento puede llevar una key no permitida', () => {
  // Una muestra representativa con TODAS las props posibles de cada evento. Si se
  // agrega una propiedad nueva a un evento sin sumarla al allowlist, este test la
  // caza: la garantía "sin PII" es verificable, no una promesa.
  const samples: { [K in keyof AnalyticsEventMap]: AnalyticsEventMap[K] } = {
    business_signed_up: { method: 'email' },
    onboarding_step_completed: { step: 1 },
    onboarding_completed: {},
    booking_link_shared: { channel: 'copy' },
    first_booking_received: {},
    booking_created: { origin: 'link', with_deposit: false },
    booking_completed: {},
    booking_no_show: {},
    booking_cancelled: { by: 'client' },
    booking_rescheduled: { by: 'business' },
    booking_page_viewed: {},
    service_selected: {},
    slot_selected: {},
    booking_form_started: {},
    booking_confirmed: { with_deposit: true },
    reminder_sent: { channel: 'email', kind: '24h' },
    reminder_failed: { channel: 'whatsapp', reason: 'delivery_error' },
    trial_started: {},
    trial_ending_soon: {},
    trial_ended: {},
    subscription_started: { plan: 'team', cycle: 'monthly' },
    subscription_upgraded: { previous_plan: 'solo', new_plan: 'team' },
    subscription_downgraded: { previous_plan: 'studio', new_plan: 'team' },
    subscription_cancelled: { plan: 'team' },
    payment_failed: {},
    plan_limit_reached: { limit: 'bookings' },
    upgrade_cta_clicked: { from: 'trial_banner' },
  };

  it('cada key de cada evento está en el allowlist', () => {
    for (const [event, props] of Object.entries(samples)) {
      for (const key of Object.keys(props)) {
        expect(ALLOWED_PROPERTY_KEYS.has(key), `${event}.${key} debe estar en el allowlist`).toBe(
          true,
        );
      }
    }
  });

  it('las props comunes también son allowlist', () => {
    expect(isSanitized({ business_id: 'b', plan: 'free', locale: 'es', country: 'CL' })).toBe(true);
  });
});
