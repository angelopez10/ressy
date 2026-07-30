import { beforeEach, describe, expect, it, vi } from 'vitest';

// Aislamos la capa de envío: registramos las llamadas a `trackServer` en vez de
// hablar con PostHog. `commonPropsFor` se neutraliza (props comunes vacías).
vi.mock('./server', () => ({
  trackServer: vi.fn(async () => {}),
  commonPropsFor: vi.fn(async () => ({})),
}));

import { trackBookingCreated } from './booking-events';
import { trackServer } from './server';

const mockTrack = vi.mocked(trackServer);

/**
 * Fake mínimo de la tabla `bookings`. `realCount` = cuántas reservas reales
 * tiene el negocio DESPUÉS de crear esta (lo que devuelve el count de primera).
 */
function makeFakeDb(booking: { business_id: string; source: string } | null, realCount: number) {
  return {
    from(table: string) {
      expect(table).toBe('bookings');
      return {
        // Dos formas de `select`: la lectura de la reserva y el count.
        select(_cols: string, opts?: { count: string; head: boolean }) {
          if (opts?.count === 'exact') {
            // Cadena del count: .eq(...).not(...) ⇒ { count }
            const chain = {
              eq: () => chain,
              not: async () => ({ count: realCount }),
            };
            return chain;
          }
          const readChain = {
            eq: () => readChain,
            maybeSingle: async () => ({ data: booking }),
          };
          return readChain;
        },
      };
    },
  } as never;
}

describe('trackBookingCreated · first_booking_received una sola vez por negocio', () => {
  beforeEach(() => mockTrack.mockClear());

  it('dispara first_booking_received SOLO en la primera reserva real (count === 1)', async () => {
    const db = makeFakeDb({ business_id: 'biz_1', source: 'link' }, 1);
    await trackBookingCreated(db, 'bk_1', { withDeposit: false });

    const events = mockTrack.mock.calls.map((c) => c[0]);
    expect(events).toContain('booking_created');
    expect(events).toContain('first_booking_received');
    expect(events.filter((e) => e === 'first_booking_received')).toHaveLength(1);
  });

  it('NO dispara first_booking_received en reservas posteriores (count > 1)', async () => {
    const db = makeFakeDb({ business_id: 'biz_1', source: 'qr' }, 4);
    await trackBookingCreated(db, 'bk_2', { withDeposit: false });

    const events = mockTrack.mock.calls.map((c) => c[0]);
    expect(events).toContain('booking_created');
    expect(events).not.toContain('first_booking_received');
  });

  it('propaga origin y with_deposit; infiere origin del source si no se pasa', async () => {
    const db = makeFakeDb({ business_id: 'biz_1', source: 'instagram' }, 2);
    await trackBookingCreated(db, 'bk_3', { withDeposit: true });

    const created = mockTrack.mock.calls.find((c) => c[0] === 'booking_created');
    expect(created?.[2]).toMatchObject({ origin: 'instagram', with_deposit: true });
  });

  it('mapea un source desconocido a "other"', async () => {
    const db = makeFakeDb({ business_id: 'biz_1', source: 'weird' }, 2);
    await trackBookingCreated(db, 'bk_4', { withDeposit: false });

    const created = mockTrack.mock.calls.find((c) => c[0] === 'booking_created');
    expect(created?.[2]).toMatchObject({ origin: 'other' });
  });

  it('no hace nada si la reserva no existe', async () => {
    const db = makeFakeDb(null, 0);
    await trackBookingCreated(db, 'missing', { withDeposit: false });
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
