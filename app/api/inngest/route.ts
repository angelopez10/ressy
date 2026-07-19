import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { functions } from '@/lib/inngest/functions';

/**
 * Endpoint que Inngest invoca para correr las funciones. En local lo descubre el
 * `inngest-cli dev`; en producción, el servicio de Inngest (firma con
 * INNGEST_SIGNING_KEY).
 */
export const { GET, POST, PUT } = serve({ client: inngest, functions });
