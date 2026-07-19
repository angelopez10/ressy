import 'server-only';

import type { ChannelRegistry } from '../types';
import { ResendEmailChannel } from './email.resend';
import { TwilioWhatsAppChannel } from './whatsapp.twilio';
import { TwilioSmsChannel } from './sms.twilio';

/** Registro de canales reales. El dispatch acepta uno inyectado (tests con mocks). */
export function defaultChannels(): ChannelRegistry {
  return {
    email: new ResendEmailChannel(),
    whatsapp: new TwilioWhatsAppChannel(),
    sms: new TwilioSmsChannel(),
  };
}
