import 'server-only';

import { Resend } from 'resend';
import { getResendConfig } from '../env';
import type { NotificationChannel, NotificationMessage, SendResult } from '../types';

/**
 * Canal de email vía Resend. Renderiza el componente react-email (`react`) o cae
 * al `text`. Los .ics van como adjunto. Nunca se llama al SDK de Resend fuera de
 * aquí (CLAUDE.md §3).
 */
export class ResendEmailChannel implements NotificationChannel {
  readonly name = 'email' as const;

  isConfigured(): boolean {
    return getResendConfig() !== null;
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    const config = getResendConfig();
    if (!config) return { ok: false, error: 'resend_not_configured' };

    try {
      const resend = new Resend(config.apiKey);
      const { data, error } = await resend.emails.send({
        from: config.from,
        to: message.to,
        subject: message.subject ?? '',
        react: message.react,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, externalId: data?.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'resend_error' };
    }
  }
}
