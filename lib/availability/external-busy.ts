/**
 * Ocupación externa (Google Calendar) — punto de extensión de la fórmula
 * `... − eventos_google_calendar` (CLAUDE.md §3).
 *
 * En esta sesión NO se integra Google. La única implementación es no-op: no resta
 * nada. Cuando llegue la integración, será otra clase que implemente
 * `ExternalBusyProvider` leyendo la API de Calendar; el motor no cambia.
 */

import type { BusyInterval, ExternalBusyProvider } from './types';

export class NoopExternalBusyProvider implements ExternalBusyProvider {
  async getBusyIntervals(): Promise<BusyInterval[]> {
    return [];
  }
}
