/**
 * Fixture del motor: el mismo negocio del seed (`supabase/seed.sql`) como bundle
 * en memoria, para probar `computeAvailability` sin DB.
 *
 * La Barbería El Corte en America/Santiago: negocio Lun-Vie 09-19 / Sáb 10-15,
 * Camila (Lun-Vie 09-18, hace ambos servicios) y Diego (Mié-Vie 12-19 + Sáb
 * 10-15, solo corte). Los tests parten de aquí y sobreescriben lo que necesitan.
 */

import type { BusinessHours, Service, StaffMember, StaffSchedule } from '@/lib/db/mappers';
import { wallTimeToUtcMs } from './time';
import type { AvailabilityInput } from './types';

export const SANTIAGO = 'America/Santiago';

export const CAMILA = '22222222-2222-2222-2222-222222222221';
export const DIEGO = '22222222-2222-2222-2222-222222222222';
export const CORTE = '33333333-3333-3333-3333-333333333331'; // 30 min, buffer_after 10
export const CORTE_BARBA = '33333333-3333-3333-3333-333333333332'; // 45 min, buffer_after 15
const BUSINESS = '11111111-1111-1111-1111-111111111111';

function staff(id: string, name: string, sortOrder: number): StaffMember {
  return {
    id,
    businessId: BUSINESS,
    userId: null,
    name,
    role: null,
    avatarUrl: null,
    canViewAllBookings: false,
    isActive: true,
    sortOrder,
  };
}

/** Servicio "Corte": 30 min, sin buffer (los buffers se prueban aparte). */
export function corteService(overrides: Partial<Service> = {}): Service {
  return {
    id: CORTE,
    businessId: BUSINESS,
    name: 'Corte de cabello',
    description: null,
    durationMin: 30,
    priceAmount: 12000,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

function hours(weekday: number, open: string, close: string): BusinessHours {
  return {
    id: `bh-${weekday}`,
    businessId: BUSINESS,
    weekday,
    openTime: open,
    closeTime: close,
  };
}

function schedule(staffId: string, weekday: number, start: string, end: string): StaffSchedule {
  return {
    id: `ss-${staffId}-${weekday}`,
    businessId: BUSINESS,
    staffMemberId: staffId,
    weekday,
    startTime: start,
    endTime: end,
  };
}

/**
 * Bundle base con solo Camila y el servicio Corte, negocio Lun-Vie 09-19.
 * Es el punto de partida mínimo; cada test añade staff, bookings u overrides.
 */
export function baseInput(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  const businessHours: BusinessHours[] = [
    hours(1, '09:00', '19:00'),
    hours(2, '09:00', '19:00'),
    hours(3, '09:00', '19:00'),
    hours(4, '09:00', '19:00'),
    hours(5, '09:00', '19:00'),
    hours(6, '10:00', '15:00'),
  ];

  const staffSchedules: StaffSchedule[] = [
    // Camila: Lun-Vie 09-18.
    schedule(CAMILA, 1, '09:00', '18:00'),
    schedule(CAMILA, 2, '09:00', '18:00'),
    schedule(CAMILA, 3, '09:00', '18:00'),
    schedule(CAMILA, 4, '09:00', '18:00'),
    schedule(CAMILA, 5, '09:00', '18:00'),
  ];

  return {
    business: { id: BUSINESS, timezone: SANTIAGO },
    service: corteService(),
    staff: [staff(CAMILA, 'Camila Rojas', 1)],
    businessHours,
    staffSchedules,
    overrides: [],
    bookings: [],
    externalBusy: [],
    policies: { minLeadTimeMin: 0, maxAdvanceDays: 365 },
    ...overrides,
  };
}

/** Añade a Diego (Mié-Vie 12-19, solo corte) al bundle. */
export function withDiego(input: AvailabilityInput): AvailabilityInput {
  return {
    ...input,
    staff: [...input.staff, staff(DIEGO, 'Diego Fuentes', 2)],
    staffSchedules: [
      ...input.staffSchedules,
      schedule(DIEGO, 3, '12:00', '19:00'),
      schedule(DIEGO, 4, '12:00', '19:00'),
      schedule(DIEGO, 5, '12:00', '19:00'),
      schedule(DIEGO, 6, '10:00', '15:00'),
    ],
  };
}

/** Helper: instante UTC desde hora local de Santiago, para escribir tests legibles. */
export function santiago(dateTime: string): Date {
  // dateTime: 'YYYY-MM-DDTHH:mm'. Delega en Luxon vía el mismo puente del motor
  // para no reimplementar la conversión de husos en los tests.
  const [datePart, timePart] = dateTime.split('T');
  const [y, m, d] = datePart!.split('-').map(Number);
  const [hh, mm] = timePart!.split(':').map(Number);
  // Reutiliza wallTimeToUtcMs para que test y motor coincidan exactamente.
  return new Date(
    wallTimeToUtcMs({ year: y!, month: m!, day: d! }, `${pad(hh!)}:${pad(mm!)}`, SANTIAGO),
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
