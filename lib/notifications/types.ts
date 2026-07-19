import type { ReactElement } from 'react';
import type { Enums } from '@/lib/db/types';

export type Channel = Enums<'notification_channel'>;
export type NotificationType = Enums<'notification_type'>;

/** Un mensaje ya renderizado, listo para que un canal lo envíe. */
export interface NotificationMessage {
  to: string;
  /** Email. */
  subject?: string;
  react?: ReactElement;
  /** Texto plano: cuerpo de WhatsApp/SMS y fallback de texto del email. */
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
  /**
   * WhatsApp Business: para mensajes iniciados por el negocio, Twilio exige una
   * plantilla PRE-APROBADA (Content SID + variables). En el sandbox se manda
   * `text` libre. Documentado en lib/notifications/whatsapp.twilio.ts.
   */
  whatsapp?: { contentSid?: string; variables?: Record<string, string> };
}

export interface SendResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

/** Interfaz común: email/WhatsApp/SMS son intercambiables (CLAUDE.md §3 · pagos-style). */
export interface NotificationChannel {
  readonly name: Channel;
  /** ¿Tiene credenciales? Si no, el dispatch lo salta y cae a otro canal. */
  isConfigured(): boolean;
  send(message: NotificationMessage): Promise<SendResult>;
}

export type ChannelRegistry = Partial<Record<Channel, NotificationChannel>>;
