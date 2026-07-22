import 'server-only';

/**
 * Llamadas REST a la API de Mercado Pago, SIEMPRE con el access token del
 * VENDEDOR (cobro/reembolso en su cuenta). Hechas a mano con `fetch` para no
 * sumar dependencia (CLAUDE.md §2): la superficie es chica y estable.
 *
 * CLP no tiene decimales: `unit_price`/`amount` van como integer de pesos.
 */

import type { NormalizedPaymentStatus } from '../types';

const BASE = 'https://api.mercadopago.com';

/** Mapea el vocabulario de estados de MP al nuestro. */
export function normalizeStatus(mp: string): NormalizedPaymentStatus {
  switch (mp) {
    case 'approved':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'in_process':
    case 'authorized':
      return 'in_process';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'pending';
  }
}

async function mpFetch<T>(
  accessToken: string,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    accept: 'application/json',
  };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.idempotencyKey) headers['x-idempotency-key'] = init.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    // Sin body en el log: puede traer datos del vendedor. Solo path + status.
    throw new Error(`MP ${init.method} ${path} falló: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface MpPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface CreatePreferenceInput {
  amount: number; // integer CLP
  currency: string;
  description: string;
  bookingId: string;
  notificationUrl: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
}

export function createPreference(
  accessToken: string,
  input: CreatePreferenceInput,
): Promise<MpPreferenceResponse> {
  return mpFetch<MpPreferenceResponse>(accessToken, '/checkout/preferences', {
    method: 'POST',
    // Idempotencia por reserva: reintentos no crean preferencias duplicadas.
    idempotencyKey: `pref-${input.bookingId}`,
    body: {
      items: [
        {
          id: input.bookingId,
          title: input.description,
          quantity: 1,
          unit_price: input.amount,
          currency_id: input.currency,
        },
      ],
      // La referencia que casa el webhook con la reserva.
      external_reference: input.bookingId,
      metadata: { booking_id: input.bookingId },
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      // El estado final SIEMPRE lo decide el webhook, no el redirect. `auto_return`
      // solo mejora la UX de vuelta; no confiamos en él para confirmar.
      auto_return: 'approved',
      // Sin marketplace_fee: Ressy no cobra comisión de plataforma.
    },
  });
}

export interface MpPaymentResponse {
  id: number;
  status: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string | null;
  external_reference: string | null;
  date_approved: string | null;
}

export async function getPayment(accessToken: string, paymentId: string): Promise<MpPaymentResponse> {
  return mpFetch<MpPaymentResponse>(accessToken, `/v1/payments/${paymentId}`, { method: 'GET' });
}

export interface MpRefundResponse {
  id: number;
  status: string;
}

/** Reembolso total (sin amount) o parcial (amount en integer CLP). */
export function refundPayment(
  accessToken: string,
  paymentId: string,
  amount?: number,
): Promise<MpRefundResponse> {
  return mpFetch<MpRefundResponse>(accessToken, `/v1/payments/${paymentId}/refunds`, {
    method: 'POST',
    idempotencyKey: `refund-${paymentId}`,
    body: amount !== undefined ? { amount } : {},
  });
}
