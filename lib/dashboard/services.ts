import 'server-only';

/** Lecturas de la pantalla Servicios. RLS acota al negocio del usuario. */

import { createClient } from '@/lib/db/server';

export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceAmount: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  isActive: boolean;
  sortOrder: number;
  staffIds: string[];
}

export async function getServices(businessId: string): Promise<ServiceDTO[]> {
  const db = await createClient();
  const [{ data: services }, { data: links }] = await Promise.all([
    db
      .from('services')
      .select('id, name, description, duration_min, price_amount, buffer_before_min, buffer_after_min, is_active, sort_order')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true }),
    db.from('service_staff').select('service_id, staff_member_id').eq('business_id', businessId),
  ]);

  const byService = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = byService.get(l.service_id) ?? [];
    arr.push(l.staff_member_id);
    byService.set(l.service_id, arr);
  }

  return (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.duration_min,
    priceAmount: s.price_amount,
    bufferBeforeMin: s.buffer_before_min,
    bufferAfterMin: s.buffer_after_min,
    isActive: s.is_active,
    sortOrder: s.sort_order,
    staffIds: byService.get(s.id) ?? [],
  }));
}

export interface StaffOption {
  id: string;
  name: string;
}

export async function getActiveStaff(businessId: string): Promise<StaffOption[]> {
  const db = await createClient();
  const { data } = await db
    .from('staff_members')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []).map((s) => ({ id: s.id, name: s.name }));
}
