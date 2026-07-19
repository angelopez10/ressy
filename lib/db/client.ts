'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseEnv } from './env';
import type { Database } from './types';

/**
 * Cliente de Supabase para el browser. Usa la publishable key, así que todo lo
 * que toque pasa por RLS.
 *
 * Recordatorio (CLAUDE.md §6): nada de fetch a la DB desde el cliente. Este
 * cliente existe para auth y realtime, no para consultar datos de negocio.
 */
export function createClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
