import 'server-only';

/**
 * Cliente de Supabase con la SECRET key: bypassa RLS por completo. SOLO para
 * código de servidor de confianza que corre FUERA de una sesión de usuario:
 * jobs de Inngest, webhooks. Nunca en un componente ni en un route handler que
 * actúe en nombre de un usuario (para eso está `lib/db/server.ts`, que respeta
 * RLS). CLAUDE.md §9.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv, getSupabaseSecretKey } from './env';
import type { Database } from './types';

export function createServiceClient() {
  const { url } = getPublicSupabaseEnv();
  return createSupabaseClient<Database>(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServiceClient = ReturnType<typeof createServiceClient>;
