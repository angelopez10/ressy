/**
 * Configuración de los proveedores de notificaciones. Todo opcional: si falta
 * la config de un canal, ese canal se reporta "no configurado" y el dispatch
 * cae a otro (nunca deja al cliente sin ninguna notificación por config faltante).
 * Ninguna de estas es `NEXT_PUBLIC_`: son secretos de servidor (CLAUDE.md §9).
 */

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export interface ResendConfig {
  apiKey: string;
  from: string;
}

export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** Número WhatsApp de origen, ej. 'whatsapp:+14155238886' o '+1415...'. */
  whatsappFrom: string;
}

export function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !whatsappFrom) return null;
  return { accountSid, authToken, whatsappFrom };
}
