import 'server-only';

/**
 * Llamadas REST al API de Suscripciones (preapproval) de Mercado Pago, SIEMPRE
 * con el access token de la CUENTA DE RESSY (el cobro del plan va a Ressy). Hecho
 * a mano con `fetch` para no sumar dependencia (CLAUDE.md §2): superficie chica.
 *
 * CLP no tiene decimales: `transaction_amount` va como integer de pesos.
 */

const BASE = 'https://api.mercadopago.com';

async function mpFetch<T>(
  accessToken: string,
  path: string,
  init: { method: 'GET' | 'POST' | 'PUT'; body?: unknown; idempotencyKey?: string },
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
    // Es la cuenta de RESSY (no un vendedor): se puede exponer el motivo de MP.
    // Extraemos solo message + cause (no el echo del request) para no loguear el
    // payer_email. Ayuda a diagnosticar el 400 (moneda, back_url, email, monto…).
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string; error?: string; cause?: unknown };
      const parts = [body.message ?? body.error, body.cause ? JSON.stringify(body.cause) : null].filter(Boolean);
      detail = parts.join(' · ');
    } catch {
      /* body no-JSON: se ignora */
    }
    throw new Error(`MP ${init.method} ${path} falló: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  return (await res.json()) as T;
}

export interface CreatePreapprovalInput {
  /** Descripción que ve el pagador (ej. "Ressy · Plan Team (mensual)"). */
  reason: string;
  /** external_reference: casa el webhook con el negocio + tier + ciclo. */
  externalReference: string;
  payerEmail: string;
  backUrl: string;
  /** URL del webhook de SUSCRIPCIONES (separado del de anticipos). */
  notificationUrl: string;
  /** Integer CLP. */
  amount: number;
  currency: string;
  /** 1 = mensual; 12 = anual (siempre en meses). */
  frequencyMonths: number;
}

export interface MpPreapprovalResponse {
  id: string;
  init_point: string;
  status: string;
  external_reference: string | null;
  payer_id: number | null;
  next_payment_date: string | null;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
  } | null;
}

export function createPreapproval(
  accessToken: string,
  input: CreatePreapprovalInput,
): Promise<MpPreapprovalResponse> {
  return mpFetch<MpPreapprovalResponse>(accessToken, '/preapproval', {
    method: 'POST',
    // Idempotencia por referencia: reintentos no crean preapprovals duplicados.
    idempotencyKey: `preapproval-${input.externalReference}`,
    body: {
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      status: 'pending', // el pagador autoriza en el init_point
      auto_recurring: {
        frequency: input.frequencyMonths,
        frequency_type: 'months',
        transaction_amount: input.amount,
        currency_id: input.currency,
      },
    },
  });
}

export function getPreapproval(accessToken: string, id: string): Promise<MpPreapprovalResponse> {
  return mpFetch<MpPreapprovalResponse>(accessToken, `/preapproval/${id}`, { method: 'GET' });
}

/** Cancela el cobro recurrente. Idempotente en MP (cancelar dos veces no falla feo). */
export function cancelPreapproval(accessToken: string, id: string): Promise<MpPreapprovalResponse> {
  return mpFetch<MpPreapprovalResponse>(accessToken, `/preapproval/${id}`, {
    method: 'PUT',
    body: { status: 'cancelled' },
  });
}

export interface MpAuthorizedPaymentResponse {
  id: number;
  preapproval_id: string | null;
  status: string;
}

/** Un cobro recurrente concreto; sirve para casar el evento con su preapproval. */
export function getAuthorizedPayment(
  accessToken: string,
  id: string,
): Promise<MpAuthorizedPaymentResponse> {
  return mpFetch<MpAuthorizedPaymentResponse>(accessToken, `/authorized_payments/${id}`, {
    method: 'GET',
  });
}
