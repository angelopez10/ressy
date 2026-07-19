import 'server-only';

import type { NotificationChannel, NotificationMessage, SendResult } from '../types';

/**
 * Canal SMS (Twilio) — STUB, inactivo en esta sesión (decisión: email + WhatsApp
 * primero). La interfaz queda lista para activarlo como fallback adicional: basta
 * implementar `send` con `client.messages.create({ from: TWILIO_SMS_FROM, to,
 * body })` y reportar `isConfigured()` según su env. Hoy siempre reporta
 * no-configurado, así que el dispatch nunca lo elige.
 */
export class TwilioSmsChannel implements NotificationChannel {
  readonly name = 'sms' as const;

  isConfigured(): boolean {
    return false;
  }

  async send(_message: NotificationMessage): Promise<SendResult> {
    return { ok: false, error: 'sms_not_implemented' };
  }
}
