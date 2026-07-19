/**
 * `AvailabilityDataSource` para la BOOKING PAGE PÚBLICA (sesión anónima).
 *
 * Por qué existe además de `SupabaseAvailabilityDataSource`: `anon` NO tiene
 * ninguna política RLS sobre `public.bookings` (migración 06). Una consulta a
 * bookings como anon devuelve cero filas en silencio, y el motor ofrecería slots
 * ya ocupados. La ocupación pública se lee de la vista `public_busy_slots`
 * (migración 05), que expone solo tiempos sin datos de cliente.
 *
 * El resto de las tablas (horas, horarios, overrides, servicios, staff,
 * políticas) sí son legibles por anon para negocios publicados, así que se leen
 * igual que en la fuente autenticada. No se toca el motor: esto es solo otra
 * implementación de la misma interfaz.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  toBusinessHours,
  toBusinessPolicies,
  toService,
  toStaffMember,
  toStaffSchedule,
} from '@/lib/db/mappers';
import type { Database } from '@/lib/db/types';
import type {
  AvailabilityDataSource,
  AvailabilityInput,
  AvailabilityQuery,
  BusyInterval,
  OverrideInterval,
} from './types';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export class PublicAvailabilityDataSource implements AvailabilityDataSource {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async load(query: AvailabilityQuery): Promise<AvailabilityInput> {
    const { businessId, serviceId } = query;
    const fromIso = query.from.toISOString();
    const toIso = query.to.toISOString();

    const [businessRes, serviceRes, policiesRes, hoursRes, serviceStaffRes] = await Promise.all([
      this.db
        .from('businesses')
        .select('id, timezone')
        .eq('id', businessId)
        .eq('is_published', true)
        .single(),
      this.db
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .single(),
      this.db.from('business_policies').select('*').eq('business_id', businessId).single(),
      this.db.from('business_hours').select('*').eq('business_id', businessId),
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
    const requested = query.staffMemberId
      ? capableStaffIds.filter((id) => id === query.staffMemberId)
      : capableStaffIds;

    const staffFilter = requested.length ? requested : [NIL_UUID];

    const [staffRes, schedulesRes, overridesRes, busyRes] = await Promise.all([
      this.db
        .from('staff_members')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .in('id', staffFilter),
      this.db
        .from('staff_schedules')
        .select('*')
        .eq('business_id', businessId)
        .in('staff_member_id', staffFilter),
      this.db
        .from('schedule_overrides')
        .select('*')
        .eq('business_id', businessId)
        .lt('starts_at', toIso)
        .gt('ends_at', fromIso),
      // OCUPACIÓN: desde la vista pública, no desde bookings. Cuatro columnas de
      // tiempo, cero PII.
      this.db
        .from('public_busy_slots')
        .select('staff_member_id, starts_at, ends_at')
        .eq('business_id', businessId)
        .lt('starts_at', toIso)
        .gt('ends_at', fromIso),
    ]);

    if (staffRes.error) throw staffRes.error;
    if (schedulesRes.error) throw schedulesRes.error;
    if (overridesRes.error) throw overridesRes.error;
    if (busyRes.error) throw busyRes.error;

    const staff = staffRes.data.map(toStaffMember);
    const staffIds = new Set(staff.map((s) => s.id));

    const overrides: OverrideInterval[] = overridesRes.data
      .filter((o) => o.staff_member_id === null || staffIds.has(o.staff_member_id))
      .map((o) => ({
        staffMemberId: o.staff_member_id,
        kind: o.kind,
        startsAt: new Date(o.starts_at),
        endsAt: new Date(o.ends_at),
      }));

    const bookings: BusyInterval[] = busyRes.data
      // La vista puede traer ocupación de staff que no hace este servicio; el
      // motor solo mira la de `staff`, pero filtramos por prolijidad.
      .filter((b) => b.staff_member_id !== null && staffIds.has(b.staff_member_id))
      .map((b) => ({
        staffMemberId: b.staff_member_id as string,
        startsAt: new Date(b.starts_at as string),
        endsAt: new Date(b.ends_at as string),
      }));

    return {
      business: { id: businessRes.data.id, timezone: businessRes.data.timezone },
      service: toService(serviceRes.data),
      staff,
      businessHours: hoursRes.data.map(toBusinessHours),
      staffSchedules: schedulesRes.data.map(toStaffSchedule),
      overrides,
      bookings,
      externalBusy: [],
      policies: toBusinessPolicies(policiesRes.data),
    };
  }
}
