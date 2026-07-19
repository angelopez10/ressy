import { describe, expect, it } from 'vitest';
import { ACTIVE_BOOKING_STATUSES, type Enums } from '@/lib/db/types';
import { computeAvailability } from './engine';
import { CAMILA, DIEGO, baseInput, corteService, santiago, withDiego } from './fixtures';
import type { AvailabilityQuery, BusyInterval, Slot } from './types';

// Lunes 2026-07-20 (invierno en Santiago, offset -04). El seed usa esta fecha.
const MON = { from: santiago('2026-07-20T00:00'), to: santiago('2026-07-21T00:00') };
// Miércoles 2026-07-22: Diego también trabaja.
const WED = { from: santiago('2026-07-22T00:00'), to: santiago('2026-07-23T00:00') };

// `now` muy anterior + políticas laxas: aísla el caso bajo prueba de las
// ventanas de tiempo, salvo en los tests que las prueban a propósito.
const LAX: Pick<AvailabilityQuery, 'now'> = { now: santiago('2026-07-19T00:00') };

function query(
  day: { from: Date; to: Date },
  extra: Partial<AvailabilityQuery> = {},
): AvailabilityQuery {
  return { businessId: 'b', serviceId: corteService().id, ...day, ...LAX, ...extra };
}

/** 'HH:mm' local de Santiago de cada slot, para aserciones legibles. */
function localTimes(slots: Slot[]): string[] {
  return slots.map((s) =>
    new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(s.startsAt),
  );
}

function booking(staffMemberId: string, start: string, end: string): BusyInterval {
  return { staffMemberId, startsAt: santiago(start), endsAt: santiago(end) };
}

describe('computeAvailability — día normal', () => {
  it('Camila 09-18, corte 30 min, sin bookings → grilla de 18 slots', () => {
    const slots = computeAvailability(baseInput(), query(MON));
    expect(slots).toHaveLength(18);
    expect(localTimes(slots)[0]).toBe('09:00');
    expect(localTimes(slots).at(-1)).toBe('17:30');
    // Todos asignados a Camila y en UTC (offset -04 → 09:00 local = 13:00Z).
    expect(slots.every((s) => s.staffMemberId === CAMILA)).toBe(true);
    expect(slots[0]!.startsAt.toISOString()).toBe('2026-07-20T13:00:00.000Z');
    expect(slots[0]!.timezone).toBe('America/Santiago');
  });
});

describe('computeAvailability — bookings', () => {
  it('un booking en medio borra solo su slot', () => {
    const input = baseInput({
      bookings: [booking(CAMILA, '2026-07-20T12:00', '2026-07-20T12:30')],
    });
    const times = localTimes(computeAvailability(input, query(MON)));
    expect(times).not.toContain('12:00');
    expect(times).toContain('11:30');
    expect(times).toContain('12:30');
    expect(times).toHaveLength(17);
  });

  it('un booking cancelado NO bloquea: el data source solo pasa estados vivos', () => {
    // Reproduce el filtro del data source: de una lista con estados mezclados,
    // solo los ACTIVE_BOOKING_STATUSES llegan al motor como ocupación.
    const raw: { status: Enums<'booking_status'>; busy: BusyInterval }[] = [
      {
        status: 'cancelled_by_client',
        busy: booking(CAMILA, '2026-07-20T11:00', '2026-07-20T11:30'),
      },
      { status: 'no_show', busy: booking(CAMILA, '2026-07-20T15:00', '2026-07-20T15:30') },
    ];
    const active = new Set<string>(ACTIVE_BOOKING_STATUSES);
    const bookings = raw.filter((r) => active.has(r.status)).map((r) => r.busy);

    const times = localTimes(computeAvailability(baseInput({ bookings }), query(MON)));
    expect(times).toContain('11:00'); // el cancelado liberó su slot
    expect(times).toContain('15:00'); // el no-show también
    expect(times).toHaveLength(18);
  });
});

describe('computeAvailability — buffers', () => {
  const withBufferAfter10 = corteService({ bufferAfterMin: 10 });

  it('el buffer posterior come el slot anterior a un booking', () => {
    const input = baseInput({
      service: withBufferAfter10,
      bookings: [booking(CAMILA, '2026-07-20T12:00', '2026-07-20T12:30')],
    });
    const times = localTimes(
      computeAvailability(input, query(MON, { serviceId: withBufferAfter10.id })),
    );
    // Sin buffer, 11:30 sobreviviría (ver test anterior). Con buffer de 10 min,
    // el slot 11:30-12:00 necesitaría estar limpio hasta 12:10 y choca con el booking.
    expect(times).not.toContain('11:30');
    expect(times).not.toContain('12:00');
    expect(times).toContain('11:00');
  });
});

describe('computeAvailability — overrides', () => {
  it('un bloqueo de almuerzo parte el día en dos', () => {
    const input = baseInput({
      overrides: [
        {
          staffMemberId: CAMILA,
          kind: 'unavailable',
          startsAt: santiago('2026-07-20T13:00'),
          endsAt: santiago('2026-07-20T14:00'),
        },
      ],
    });
    const times = localTimes(computeAvailability(input, query(MON)));
    expect(times).not.toContain('13:00');
    expect(times).not.toContain('13:30');
    expect(times).toContain('12:30');
    expect(times).toContain('14:00');
    expect(times).toHaveLength(16);
  });

  it('una vacación de día completo deja cero slots', () => {
    const input = baseInput({
      overrides: [
        {
          staffMemberId: CAMILA,
          kind: 'unavailable',
          startsAt: santiago('2026-07-20T00:00'),
          endsAt: santiago('2026-07-21T00:00'),
        },
      ],
    });
    expect(computeAvailability(input, query(MON))).toHaveLength(0);
  });

  it('un override de negocio (staff NULL) cierra a todo el mundo', () => {
    const input = withDiego(
      baseInput({
        overrides: [
          {
            staffMemberId: null,
            kind: 'unavailable',
            startsAt: santiago('2026-07-22T00:00'),
            endsAt: santiago('2026-07-23T00:00'),
          },
        ],
      }),
    );
    expect(computeAvailability(input, query(WED, { staffMemberId: undefined }))).toHaveLength(0);
  });
});

describe('computeAvailability — DST', () => {
  it('el mismo horario recurrente cae en UTC distinto a cada lado del cambio', () => {
    // Lunes 2026-09-07 ya es horario de verano (-03). 09:00 local = 12:00Z,
    // no 13:00Z como en julio. Sin duplicar ni saltar slots: siguen siendo 18.
    const sep = { from: santiago('2026-09-07T00:00'), to: santiago('2026-09-08T00:00') };
    const slots = computeAvailability(
      baseInput(),
      query(sep, { now: santiago('2026-09-01T00:00') }),
    );

    expect(slots).toHaveLength(18);
    expect(slots[0]!.startsAt.toISOString()).toBe('2026-09-07T12:00:00.000Z');
    expect(localTimes(slots)[0]).toBe('09:00');
    expect(localTimes(slots).at(-1)).toBe('17:30');

    // Ningún hueco ni solape: slots consecutivos separados exactamente 30 min.
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i]!.startsAt.getTime() - slots[i - 1]!.startsAt.getTime();
      expect(gap).toBe(30 * 60_000);
    }
  });
});

describe('computeAvailability — políticas', () => {
  it('ventana mínima: a media mañana no aparecen slots pasados ni dentro del lead', () => {
    // now = 10:00 local, lead 120 min → nada antes de 12:00.
    const q = query(MON, { now: santiago('2026-07-20T10:00') });
    const input = baseInput({ policies: { minLeadTimeMin: 120, maxAdvanceDays: 365 } });
    const times = localTimes(computeAvailability(input, q));
    expect(times[0]).toBe('12:00');
    expect(times).not.toContain('09:00');
    expect(times).not.toContain('11:30');
  });

  it('anticipación máxima: no hay slots más allá de N días', () => {
    // Rango de 5 días, pero maxAdvance = 1 día desde `now` (00:00 del lunes).
    const week = { from: santiago('2026-07-20T00:00'), to: santiago('2026-07-25T00:00') };
    const input = baseInput({ policies: { minLeadTimeMin: 0, maxAdvanceDays: 1 } });
    const slots = computeAvailability(input, query(week, { now: santiago('2026-07-20T00:00') }));
    // Solo quedan slots del lunes; el martes 09:00 ya supera now+1día.
    const days = new Set(
      slots.map((s) =>
        new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit' }).format(
          s.startsAt,
        ),
      ),
    );
    expect([...days]).toEqual(['20']);
  });
});

describe('computeAvailability — cualquier profesional', () => {
  it('con un staff ocupado y otro libre, el slot sigue y se asigna al libre', () => {
    const input = withDiego(
      baseInput({ bookings: [booking(CAMILA, '2026-07-22T12:00', '2026-07-22T12:30')] }),
    );
    const slots = computeAvailability(input, query(WED, { staffMemberId: undefined }));
    const noon = slots.find((s) => localTimes([s])[0] === '12:00');
    expect(noon).toBeDefined();
    expect(noon!.availableStaffIds).toEqual([DIEGO]);
    expect(noon!.staffMemberId).toBe(DIEGO);
  });

  it('con ambos libres, el asignado es el de menor sortOrder (Camila) y ambos son candidatos', () => {
    const input = withDiego(baseInput());
    const slots = computeAvailability(input, query(WED, { staffMemberId: undefined }));
    const noon = slots.find((s) => localTimes([s])[0] === '12:00')!;
    expect(noon.availableStaffIds).toEqual([CAMILA, DIEGO]);
    expect(noon.staffMemberId).toBe(CAMILA);
  });

  it('filtrando por un staff concreto, solo aparecen sus slots', () => {
    const input = withDiego(baseInput());
    const slots = computeAvailability(input, query(WED, { staffMemberId: DIEGO }));
    // Diego trabaja 12-19 el miércoles: primer slot 12:00.
    expect(localTimes(slots)[0]).toBe('12:00');
    expect(slots.every((s) => s.staffMemberId === DIEGO)).toBe(true);
  });
});
