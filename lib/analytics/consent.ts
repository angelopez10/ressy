/**
 * Consentimiento de analytics (client-side). Modelo aprobado: OPT-OUT POR
 * REGIÓN — analytics ON por defecto, salvo en jurisdicciones GDPR/EEA donde
 * arranca OFF hasta que el visitante consiente.
 *
 * Este módulo guarda/lee la DECISIÓN; NO geolocaliza. El default por región lo
 * fija el banner de consentimiento: para un visitante de la EEA sin decisión
 * previa, el banner llama `denyAnalytics()` (bloquea) hasta que acepte
 * (`grantAnalytics()`); fuera de la EEA no bloquea nada. Así `track()` solo
 * consulta un booleano y no le importa la normativa.
 *
 * Respeta además `Do Not Track` del navegador como opt-out implícito.
 */

const STORAGE_KEY = 'ressy_analytics_consent';

type Decision = 'granted' | 'denied';

function readDecision(): Decision | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function doNotTrack(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt =
    navigator.doNotTrack ??
    (window as unknown as { doNotTrack?: string }).doNotTrack ??
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt === '1' || dnt === 'yes';
}

/**
 * ¿Puede trackear ahora mismo? Regla: sin decisión explícita ⇒ permitido
 * (opt-out; el banner ya habrá puesto `denied` en la EEA). `Do Not Track` o una
 * decisión `denied` ⇒ bloqueado.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false; // el server no usa esta capa
  if (doNotTrack()) return false;
  const decision = readDecision();
  return decision !== 'denied';
}

export function grantAnalytics(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'granted');
  } catch {
    /* almacenamiento no disponible ⇒ se queda en el default de sesión */
  }
}

export function denyAnalytics(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'denied');
  } catch {
    /* idem */
  }
}

/** ¿El visitante ya tomó una decisión explícita? (para saber si mostrar el banner). */
export function hasDecided(): boolean {
  return readDecision() !== null;
}
