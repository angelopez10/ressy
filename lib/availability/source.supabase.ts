/**
 * Implementación de `AvailabilityDataSource` sobre Supabase.
 *
 * Toda consulta filtra por `business_id` (CLAUDE.md §3) y corre bajo RLS: este
 * data source no es un bypass, es el camino normal de lectura. El motor puro no
 * sabe que Supabase existe; solo ve `AvailabilityInput`.
 *
 * Precondiciones que este data source garantiza para el motor:
 *   - `staff`: activos y habilitados para el servicio (join `service_staff`).
 *   - `bookings`: solo estados que bloquean (ACTIVE_BOOKING_STATUSES).
 *   - Overrides y bookings acotados al rango de la consulta.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  toBusinessHours,
  toBusinessPolicies,
  toService,
  toStaffMember,
  toStaffSchedule,
} from '@/lib/db/mappers';
import { ACTIVE_BOOKING_STATUSES, type Database } from '@/lib/db/types';
import type {
  AvailabilityDataSource,
  AvailabilityInput,
  AvailabilityQuery,
  BusyInterval,
  OverrideInterval,
} from './types';

// `.in('id', [])` en PostgREST no filtra nada (traería TODO). Cuando no hay
// staff candidato usamos este UUID nulo imposible para forzar un resultado vacío.
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export class SupabaseAvailabilityDataSource implements AvailabilityDataSource {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async load(query: AvailabilityQuery): Promise<AvailabilityInput> {
    const { businessId, serviceId } = query;
    const fromIso = query.from.toISOString();
    const toIso = query.to.toISOString();

    const [businessRes, serviceRes, policiesRes, hoursRes, serviceStaffRes] = await Promise.all([
      this.db.from('businesses').select('id, timezone').eq('id', businessId).single(),
      this.db
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .single(),
      this.db.from('business_policies').select('*').eq('business_id', businessId).single(),
      this.db.from('business_hours').select('*').eq('business_id', businessId),
      // IDs del staff habilitado para el servicio. La ficha se trae aparte: el
      // join anidado no está tipado (types.ts lleva Relationships vacío), así que
      // dos consultas simples son más seguras que una con tipos rotos.
      this.db
        .from('service_staff')
        .select('staff_member_id')
        .eq('business_id', businessId)
        .eq('service_id', serviceId),
    ]);

    if (businessRes.error) throw businessRes.error;
    if (serviceRes.error) throw serviceRes.error;
    if (policiesRes.error) throw policiesRes.error;
    if (hoursRes.error) throw hoursRes.error;
    if (serviceStaffRes.error) throw serviceStaffRes.error;

    const capableStaffIds = serviceStaffRes.data.map((row) => row.staff_member_id);
    // Si un staffMemberId de la consulta no hace este servicio, la lista queda
    // vacía y el motor devolverá cero slots — correcto.
    const requested = query.staffMemberId
      ? capableStaffIds.filter((id) => id === query.staffMemberId)
      : capableStaffIds;

    const staffRes = await this.db
      .from('staff_members')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .in('id', requested.length ? requested : [NIL_UUID]);
    if (staffRes.error) throw staffRes.error;

    const staff = staffRes.data.map(toStaffMember);
    const staffIds = staff.map((s) => s.id);

    const [schedulesRes, overridesRes, bookingsRes] = await Promise.all([
      this.db
        .from('staff_schedules')
        .select('*')
        .eq('business_id', businessId)
        .in('staff_member_id', staffIds.length ? staffIds : [NIL_UUID]),
      // Overrides del negocio (staff NULL) o de los staff candidatos, que se
      // solapen con el rango. Un override que empieza antes del rango pero lo
      // cruza también cuenta, de ahí el `lt/gt` cruzado.
      this.db
        .from('schedule_overrides')
        .select('*')
        .eq('business_id', businessId)
        .lt('starts_at', toIso)
        .gt('ends_at', fromIso),
      this.db
        .from('bookings')
        .select('staff_member_id, starts_at, ends_at, status')
        .eq('business_id', businessId)
        .in('status', ACTIVE_BOOKING_STATUSES)
        .lt('starts_at', toIso)
        .gt('ends_at', fromIso),
    ]);

    if (schedulesRes.error) throw schedulesRes.error;
    if (overridesRes.error) throw overridesRes.error;
    if (bookingsRes.error) throw bookingsRes.error;

    const staffIdSet = new Set(staffIds);
    const overrides: OverrideInterval[] = overridesRes.data
      // Los de negocio (NULL) aplican siempre; los de staff, solo si el staff es candidato.
      .filter((o) => o.staff_member_id === null || staffIdSet.has(o.staff_member_id))
      .map((o) => ({
        staffMemberId: o.staff_member_id,
        kind: o.kind,
        startsAt: new Date(o.starts_at),
        endsAt: new Date(o.ends_at),
      }));

    const bookings: BusyInterval[] = bookingsRes.data.map((b) => ({
      staffMemberId: b.staff_member_id,
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
    }));

    return {
      business: { id: businessRes.data.id, timezone: businessRes.data.timezone },
      service: toService(serviceRes.data),
      staff,
      businessHours: hoursRes.data.map(toBusinessHours),
      staffSchedules: schedulesRes.data.map(toStaffSchedule),
      overrides,
      bookings,
      externalBusy: [], // lo inyecta getAvailableSlots vía ExternalBusyProvider
      policies: toBusinessPolicies(policiesRes.data),
    };
  }
}
