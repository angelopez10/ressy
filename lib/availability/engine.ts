/**
 * Motor de disponibilidad — el corazón técnico de Ressy (CLAUDE.md §3).
 *
 *   slots = horario_staff ∩ horario_negocio − bookings − bloqueos − gcal
 *
 * Dos entradas:
 *   - `computeAvailability(input, query)` — PURA. Recibe todos los datos ya
 *     cargados y un `now` inyectado. Es lo que prueban los tests con el seed.
 *   - `getAvailableSlots(source, query)` — orquesta: carga vía el data source y
 *     delega en la función pura. La DB vive detrás de `AvailabilityDataSource`.
 *
 * Nada aquí toca la red, el reloj real ni formatea husos: entra data, sale
 * `Slot[]` en UTC.
 */

import type { StaffMember } from '@/lib/db/mappers';
import { NoopExternalBusyProvider } from './external-busy';
import { type Interval, intersect, normalize, overlaps, subtract, union } from './intervals';
import { type CalendarDay, calendarDaysInRange, isoWeekday, wallTimeToUtcMs } from './time';
import type {
  AvailabilityDataSource,
  AvailabilityInput,
  AvailabilityQuery,
  ExternalBusyProvider,
  OverrideInterval,
  Slot,
} from './types';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

function toInterval(busy: { startsAt: Date; endsAt: Date }): Interval {
  return { start: busy.startsAt.getTime(), end: busy.endsAt.getTime() };
}

/**
 * Resuelve el horario RECURRENTE de un día (business_hours o staff_schedules)
 * a intervalos UTC, aplicando la conversión hora-local→UTC con DST correcto.
 * Varios tramos el mismo día (ej. mañana y tarde) se fusionan en `normalize`.
 */
function recurringIntervalsForDay(
  rows: { weekday: number; start: string; end: string }[],
  day: CalendarDay,
  weekday: number,
  timezone: string,
): Interval[] {
  const intervals = rows
    .filter((r) => r.weekday === weekday)
    .map((r) => ({
      start: wallTimeToUtcMs(day, r.start, timezone),
      end: wallTimeToUtcMs(day, r.end, timezone),
    }));
  return normalize(intervals);
}

/**
 * Disponibilidad base de un profesional en un día: su horario recurrente,
 * MÁS sus overrides `available`, MENOS sus overrides `unavailable`, todo
 * intersectado con el horario de atención del negocio (un slot fuera del local
 * no existe aunque el staff esté libre — CLAUDE.md §3, término `∩ horario_negocio`).
 *
 * Los overrides de negocio (`staffMemberId: null`) actúan sobre el horario del
 * NEGOCIO; los de un staff, sobre el suyo. Así un feriado (override de negocio
 * `unavailable`) cierra a todos, y una hora médica (override de staff) solo a uno.
 */
function staffDayAvailability(
  staffId: string,
  day: CalendarDay,
  weekday: number,
  input: AvailabilityInput,
): Interval[] {
  const tz = input.business.timezone;

  const businessRecurring = recurringIntervalsForDay(
    input.businessHours.map((h) => ({ weekday: h.weekday, start: h.openTime, end: h.closeTime })),
    day,
    weekday,
    tz,
  );
  const businessOpen = applyOverrides(businessRecurring, input.overrides, null);

  const staffRecurring = recurringIntervalsForDay(
    input.staffSchedules
      .filter((s) => s.staffMemberId === staffId)
      .map((s) => ({ weekday: s.weekday, start: s.startTime, end: s.endTime })),
    day,
    weekday,
    tz,
  );
  const staffOpen = applyOverrides(staffRecurring, input.overrides, staffId);

  return intersect(staffOpen, businessOpen);
}

/**
 * Aplica los overrides que apuntan a `target` (un staffId, o `null` para los de
 * negocio): suma los `available`, resta los `unavailable`. El `available` se
 * suma primero para que un `unavailable` que lo pise gane — el bloqueo es la
 * intención más fuerte.
 */
function applyOverrides(
  base: Interval[],
  overrides: OverrideInterval[],
  target: string | null,
): Interval[] {
  const mine = overrides.filter((o) => o.staffMemberId === target);
  const available = mine.filter((o) => o.kind === 'available').map(toInterval);
  const unavailable = mine.filter((o) => o.kind === 'unavailable').map(toInterval);

  const extended = union(base, available);
  return subtract(extended, unavailable);
}

/**
 * Genera los starts candidatos de un profesional en un día ya resuelto a
 * intervalos libres `freeBody`, y los filtra por buffers, bookings, ocupación
 * externa y políticas. Devuelve los instantes de inicio (ms) válidos.
 */
function candidateStartsForStaff(
  staffId: string,
  freeBody: Interval[],
  input: AvailabilityInput,
  params: {
    durationMs: number;
    bufferBeforeMs: number;
    bufferAfterMs: number;
    stepMs: number;
    earliestStart: number;
    latestStart: number;
    rangeStart: number;
    rangeEnd: number;
  },
): number[] {
  // Zonas que el buffer del nuevo slot no puede pisar: reservas vivas + externo
  // de ESTE staff. Los buffers no se recortan contra el borde de la jornada
  // (decisión de diseño 03A): solo separan de otras ocupaciones.
  const staffBusy = normalize([
    ...input.bookings.filter((b) => b.staffMemberId === staffId).map(toInterval),
    ...input.externalBusy.filter((b) => b.staffMemberId === staffId).map(toInterval),
  ]);

  const starts: number[] = [];
  for (const free of freeBody) {
    for (let start = free.start; start + params.durationMs <= free.end; start += params.stepMs) {
      const end = start + params.durationMs;

      // Políticas y rango pedido.
      if (start < params.earliestStart || start > params.latestStart) continue;
      if (start < params.rangeStart || start >= params.rangeEnd) continue;

      // El cuerpo cabe en `free` por la condición del for. Falta que la zona con
      // buffers no choque con ninguna ocupación del profesional.
      const buffered: Interval = {
        start: start - params.bufferBeforeMs,
        end: end + params.bufferAfterMs,
      };
      const clashes = staffBusy.some((busy) => overlaps(buffered, busy));
      if (!clashes) starts.push(start);
    }
  }
  return starts;
}

/**
 * Núcleo PURO. Dado el bundle de datos y la consulta, devuelve los slots en UTC.
 * Determinista: mismo input + mismo `now` ⇒ mismo output.
 */
export function computeAvailability(input: AvailabilityInput, query: AvailabilityQuery): Slot[] {
  const now = (query.now ?? new Date()).getTime();
  const { service } = input;
  const tz = input.business.timezone;

  const durationMs = service.durationMin * MINUTE_MS;
  const bufferBeforeMs = service.bufferBeforeMin * MINUTE_MS;
  const bufferAfterMs = service.bufferAfterMin * MINUTE_MS;
  const stepMs = (query.stepMin ?? service.durationMin) * MINUTE_MS;

  // Políticas (CLAUDE.md §3): no ofrecer antes de ahora+lead ni más allá de N días.
  const earliestStart = now + input.policies.minLeadTimeMin * MINUTE_MS;
  const latestStart = now + input.policies.maxAdvanceDays * DAY_MS;
  const rangeStart = query.from.getTime();
  const rangeEnd = query.to.getTime();

  // Staff candidato: si la consulta fija uno, solo ese; si no, todos los del bundle
  // (el data source ya los filtró a activos + habilitados para el servicio).
  const candidateStaff: StaffMember[] = query.staffMemberId
    ? input.staff.filter((s) => s.id === query.staffMemberId)
    : input.staff;

  const days = calendarDaysInRange(query.from, query.to, tz);

  // start (ms) → set de staff disponibles. Agrupar por instante es lo que resuelve
  // "cualquier profesional": un mismo horario ofrecido por varios barberos es un
  // solo slot con varios candidatos.
  const byStart = new Map<number, Set<string>>();

  for (const staff of candidateStaff) {
    const params = {
      durationMs,
      bufferBeforeMs,
      bufferAfterMs,
      stepMs,
      earliestStart,
      latestStart,
      rangeStart,
      rangeEnd,
    };
    for (const day of days) {
      const weekday = isoWeekday(day, tz);
      const freeBody = staffDayAvailability(staff.id, day, weekday, input);
      if (freeBody.length === 0) continue;
      for (const start of candidateStartsForStaff(staff.id, freeBody, input, params)) {
        let set = byStart.get(start);
        if (!set) {
          set = new Set();
          byStart.set(start, set);
        }
        set.add(staff.id);
      }
    }
  }

  // Orden de asignación en modo "cualquier profesional": menor sortOrder, luego
  // id para desempate estable.
  const staffRank = new Map(input.staff.map((s) => [s.id, s] as const));
  const rank = (id: string): [number, string] => {
    const s = staffRank.get(id);
    return [s?.sortOrder ?? Number.MAX_SAFE_INTEGER, id];
  };

  const slots: Slot[] = [];
  for (const [start, staffIds] of byStart) {
    const available = [...staffIds].sort((a, b) => {
      const [ra, ia] = rank(a);
      const [rb, ib] = rank(b);
      return ra - rb || ia.localeCompare(ib);
    });
    slots.push({
      startsAt: new Date(start),
      endsAt: new Date(start + durationMs),
      timezone: tz,
      staffMemberId: available[0]!,
      availableStaffIds: available,
    });
  }

  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return slots;
}

/**
 * Orquestador con acceso a datos. Carga el bundle vía el data source (que aplica
 * RLS y filtra por tenant), le suma la ocupación externa y delega en la función
 * pura.
 *
 * CACHÉ (pendiente, ver diseño 03A): iría envolviendo `source` con un decorador
 * que cachea por `(businessId, staffMemberId, díaEnTzDelNegocio)` los intervalos
 * `freeBody`, invalidando al escribir una reserva/override/horario que toque ese
 * (staff, día). El motor puro no cambia; la caché es una preocupación del data
 * source, no del cálculo.
 */
export async function getAvailableSlots(
  source: AvailabilityDataSource,
  query: AvailabilityQuery,
  externalBusy: ExternalBusyProvider = new NoopExternalBusyProvider(),
): Promise<Slot[]> {
  const input = await source.load(query);

  const external = await externalBusy.getBusyIntervals({
    businessId: query.businessId,
    staffMemberIds: input.staff.map((s) => s.id),
    from: query.from,
    to: query.to,
  });

  return computeAvailability({ ...input, externalBusy: external }, query);
}
