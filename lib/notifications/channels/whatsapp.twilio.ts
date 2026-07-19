import 'server-only';

import twilio from 'twilio';
import { getTwilioConfig } from '../env';
import type { NotificationChannel, NotificationMessage, SendResult } from '../types';

/**
 * Canal de WhatsApp vía Twilio.
 *
 * ⚠️ WhatsApp Business exige PLANTILLAS PRE-APROBADAS para mensajes iniciados por
 * el negocio (fuera de la ventana de 24h de servicio al cliente). En producción
 * hay que registrar y aprobar en Twilio estas plantillas de contenido, y este
 * canal las usa vía `contentSid` + `variables`:
 *
 *   1. ressy_confirmation  — "Reserva confirmada en {{1}} · {{2}} · {{3}}. Gestiona: {{4}}"
 *   2. ressy_reminder      — "Recordatorio {{1}}: {{2}} el {{3}}. ¿No puedes ir? {{4}}"
 *   3. ressy_rescheduled   — "Tu cita en {{1}} cambió a {{2}}. Gestiona: {{3}}"
 *   4. ressy_cancelled     — "Tu reserva en {{1}} ({{2}}) fue cancelada."
 *
 * En el SANDBOX de Twilio (dev) se permite texto libre (`body`) al número unido
 * al sandbox, así que si no hay `contentSid` se manda `message.text`.
 */
export class TwilioWhatsAppChannel implements NotificationChannel {
  readonly name = 'whatsapp' as const;

  isConfigured(): boolean {
    return getTwilioConfig() !== null;
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    const config = getTwilioConfig();
    if (!config) return { ok: false, error: 'twilio_not_configured' };

    try {
      const client = twilio(config.accountSid, config.authToken);
      const from = config.whatsappFrom.startsWith('whatsapp:')
        ? config.whatsappFrom
        : `whatsapp:${config.whatsappFrom}`;
      const to = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`;

      const res = await client.messages.create({
        from,
        to,
        // Plantilla aprobada si la hay; si no (sandbox), cuerpo libre.
        ...(message.whatsapp?.contentSid
          ? {
              contentSid: message.whatsapp.contentSid,
              contentVariables: JSON.stringify(message.whatsapp.variables ?? {}),
            }
          : { body: message.text }),
      });
      return { ok: true, externalId: res.sid };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'twilio_error' };
    }
  }
}
