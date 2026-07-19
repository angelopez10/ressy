import 'server-only';

/** Lecturas de Equipo. RLS acota al negocio. */

import { createClient } from '@/lib/db/server';

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  canViewAll: boolean;
  serviceIds: string[];
}

export interface ServiceOption {
  id: string;
  name: string;
}

export async function getTeam(businessId: string): Promise<TeamMember[]> {
  const db = await createClient();
  const [{ data: staff }, { data: links }] = await Promise.all([
    db
      .from('staff_members')
      .select('id, name, role, avatar_url, can_view_all_bookings')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    db.from('service_staff').select('service_id, staff_member_id').eq('business_id', businessId),
  ]);

  const byStaff = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = byStaff.get(l.staff_member_id) ?? [];
    arr.push(l.service_id);
    byStaff.set(l.staff_member_id, arr);
  }

  return (staff ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    avatarUrl: s.avatar_url,
    canViewAll: s.can_view_all_bookings,
    serviceIds: byStaff.get(s.id) ?? [],
  }));
}

/** staffId → su horario semanal (hora local), para el editor de horarios. */
export async function getStaffSchedules(
  businessId: string,
): Promise<Record<string, { weekday: number; startTime: string; endTime: string }[]>> {
  const db = await createClient();
  const { data } = await db
    .from('staff_schedules')
    .select('staff_member_id, weekday, start_time, end_time')
    .eq('business_id', businessId);
  const map: Record<string, { weekday: number; startTime: string; endTime: string }[]> = {};
  for (const r of data ?? []) {
    (map[r.staff_member_id] ??= []).push({
      weekday: r.weekday,
      startTime: r.start_time,
      endTime: r.end_time,
    });
  }
  return map;
}

export async function getServiceOptions(businessId: string): Promise<ServiceOption[]> {
  const db = await createClient();
  const { data } = await db
    .from('services')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []).map((s) => ({ id: s.id, name: s.name }));
}
