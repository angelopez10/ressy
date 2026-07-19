import { beforeEach, describe, expect, it, vi } from 'vitest';

// Aísla la carga de datos: controlamos el contexto de la reserva por test.
vi.mock('./data', () => ({
  loadBookingContext: vi.fn(),
  getSettings: vi.fn(),
  loadOwnerEmail: vi.fn(),
  loadAgenda: vi.fn(),
  DEFAULT_SETTINGS: {},
}));

// El render (plantillas react-email) no es parte de esta prueba: los canales van
// mockeados, así que nada se renderiza. Se stubbea para no cargar los .tsx.
vi.mock('./render', () => ({
  buildClientMessage: () => ({ to: 'x', text: 'hi' }),
  buildBusinessMessage: () => ({ to: 'x', text: 'hi' }),
  buildDailySummaryMessage: () => ({ to: 'x', text: 'hi' }),
}));

import { dispatchClientNotification } from './dispatch';
import { loadBookingContext } from './data';
import type { BookingNotifCtx } from './data';
import type { NotificationChannel } from './types';

/** Fake mínimo de la tabla `notifications`: idempotencia por dedup_key en memoria. */
function makeFakeDb() {
  const store = new Map<string, { id: string; status: string }>();
  let n = 0;
  return {
    _store: store,
    from() {
      return {
        insert: (row: { dedup_key: string }) => ({
          select: () => ({
            single: async () => {
              if (store.has(row.dedup_key)) return { data: null, error: { code: '23505' } };
              const id = `n${++n}`;
              store.set(row.dedup_key, { id, status: 'pending' });
              return { data: { id }, error: null };
            },
          }),
        }),
        select: () => ({
          eq: (_c: string, key: string) => ({
            maybeSingle: async () => ({ data: store.get(key) ?? null }),
          }),
        }),
        update: (patch: { status?: string }) => ({
          eq: async (_c: string, id: string) => {
            for (const row of store.values()) if (row.id === id && patch.status) row.status = patch.status;
            return {};
          },
        }),
      };
    },
    rpc: async () => ({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function mockChannel(name: 'email' | 'whatsapp', ok: boolean): NotificationChannel & { send: ReturnType<typeof vi.fn> } {
  return {
    name,
    isConfigured: () => true,
    send: vi.fn(async () => (ok ? { ok: true, externalId: `${name}-1` } : { ok: false, error: 'boom' })),
  };
}

function makeCtx(over: Partial<BookingNotifCtx['booking']> & { tier?: BookingNotifCtx['business']['tier']; phone?: string | null; whatsappEnabled?: boolean } = {}): BookingNotifCtx {
  return {
    booking: {
      id: 'bk1',
      startsAt: new Date('2026-08-01T15:00:00Z'),
      endsAt: new Date('2026-08-01T15:30:00Z'),
      status: over.status ?? 'confirmed',
      priceAmount: 10000,
      currency: 'CLP',
      note: null,
      managementToken: 'tok',
    },
    service: { name: 'Corte', durationMin: 30 },
    staff: { name: 'Vane' },
    customer: { fullName: 'Cami', email: 'cami@example.com', phone: over.phone ?? null, locale: 'es' },
    business: {
      id: 'biz1', name: 'Barbería', slug: 'barberia', timezone: 'America/Santiago', currency: 'CLP',
      tier: over.tier ?? 'free', address: null, logoUrl: null, accentColor: null,
    },
    settings: {
      confirmationEnabled: true, reminder1Enabled: true, reminder1Hours: 24, reminder2Enabled: true, reminder2Hours: 2,
      rescheduledEnabled: true, cancelledEnabled: true, businessNewBookingEnabled: true, businessCancellationEnabled: true,
      dailySummaryEnabled: false, dailySummaryHour: 8, whatsappEnabled: over.whatsappEnabled ?? true, customMessage: null,
    },
  };
}

const mockedLoad = vi.mocked(loadBookingContext);

describe('dispatchClientNotification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('idempotencia: un reintento no reenvía', async () => {
    mockedLoad.mockResolvedValue(makeCtx());
    const email = mockChannel('email', true);
    const db = makeFakeDb();

    const r1 = await dispatchClientNotification({ bookingId: 'bk1', type: 'confirmation' }, { db, channels: { email } });
    const r2 = await dispatchClientNotification({ bookingId: 'bk1', type: 'confirmation' }, { db, channels: { email } });

    expect(r1.status).toBe('sent');
    expect(r2.status).toBe('skipped');
    expect(email.send).toHaveBeenCalledTimes(1);
  });

  it('validar antes de enviar: reserva cancelada ⇒ recordatorio NO sale', async () => {
    mockedLoad.mockResolvedValue(makeCtx({ status: 'cancelled_by_client' }));
    const email = mockChannel('email', true);
    const db = makeFakeDb();

    const res = await dispatchClientNotification({ bookingId: 'bk1', type: 'reminder', dedupKey: 'bk1:reminder:1440' }, { db, channels: { email } });

    expect(res.status).toBe('skipped');
    expect(email.send).not.toHaveBeenCalled();
  });

  it('fallback: si WhatsApp falla, cae a email', async () => {
    mockedLoad.mockResolvedValue(makeCtx({ tier: 'pro', phone: '+56900000000', whatsappEnabled: true }));
    const whatsapp = mockChannel('whatsapp', false);
    const email = mockChannel('email', true);
    const db = makeFakeDb();

    const res = await dispatchClientNotification({ bookingId: 'bk1', type: 'confirmation' }, { db, channels: { whatsapp, email } });

    expect(whatsapp.send).toHaveBeenCalledTimes(1);
    expect(email.send).toHaveBeenCalledTimes(1);
    expect(res.status).toBe('sent');
    expect(res.channel).toBe('email');
  });

  it('fallo transitorio al reservar ⇒ LANZA (Inngest reintenta, no salta en silencio)', async () => {
    mockedLoad.mockResolvedValue(makeCtx());
    const email = mockChannel('email', true);
    // db cuyo insert falla con un error NO-conflicto (conexión), sin fila previa.
    const db = {
      from: () => ({
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '08006', message: 'conn reset' } }) }) }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        update: () => ({ eq: async () => ({}) }),
      }),
      rpc: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await expect(
      dispatchClientNotification({ bookingId: 'bk1', type: 'confirmation' }, { db, channels: { email } }),
    ).rejects.toThrow();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('límite por plan: Free no usa WhatsApp aunque haya teléfono', async () => {
    mockedLoad.mockResolvedValue(makeCtx({ tier: 'free', phone: '+56900000000', whatsappEnabled: true }));
    const whatsapp = mockChannel('whatsapp', true);
    const email = mockChannel('email', true);
    const db = makeFakeDb();

    const res = await dispatchClientNotification({ bookingId: 'bk1', type: 'confirmation' }, { db, channels: { whatsapp, email } });

    expect(whatsapp.send).not.toHaveBeenCalled();
    expect(email.send).toHaveBeenCalledTimes(1);
    expect(res.channel).toBe('email');
  });
});
