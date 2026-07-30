/**
 * Punto de entrada CLIENT-SAFE de la capa de analytics. Los componentes de UI
 * importan desde aquí (`track`, consent, tipos). El código de servidor importa
 * directo de `./server` y `./booking-events` (marcados `server-only`), que NO se
 * re-exportan acá para no arrastrar posthog-node al bundle del cliente.
 */

export { track, identifyBusiness, setBusinessGroup, resetAnalytics } from './track';
export {
  hasAnalyticsConsent,
  grantAnalytics,
  denyAnalytics,
  hasDecided,
} from './consent';
export type {
  AnalyticsEvent,
  AnalyticsEventMap,
  AnalyticsLocale,
  CommonProps,
  EventProps,
  TrackPayload,
} from './events';
