import 'server-only';

/**
 * Lectura de anticipos cobrados para el dashboard (sesión 10B). Usa el cliente
 * autenticado: la RLS de `booking_payments` deja leer solo a los miembros del
 * negocio. Los montos están en la cuenta MP DEL NEGOCIO, no en Ressy.
 */

import { createClient } from '@/lib/db/server';

export interface DepositRow {
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  createdAt: string;
  serviceName: string | null;
  customerName: string | null;
}

/** Anticipos del negocio (más recientes primero). Solo provider = mercadopago. */
export async function getDeposits(businessId: string, limit = 50): Promise<DepositRow[]> {
  const db = await createClient();
  const { data } = await db
    .from('booking_payments')
    .select(
      'booking_id, amount, currency, status, method, created_at, bookings(services(name), customers(full_name))',
    )
    .eq('business_id', businessId)
    .eq('provider', 'mercadopago')
    .order('created_at', { ascending: false })
    .limit(limit);

  type Row = {
    booking_id: string;
    amount: number;
    currency: string;
    status: string;
    method: string | null;
    created_at: string;
    bookings: { services: { name: string } | null; customers: { full_name: string } | null } | null;
  };

  return ((data as unknown as Row[] | null) ?? []).map((r) => ({
    bookingId: r.booking_id,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    method: r.method,
    createdAt: r.created_at,
    serviceName: r.bookings?.services?.name ?? null,
    customerName: r.bookings?.customers?.full_name ?? null,
  }));
}
