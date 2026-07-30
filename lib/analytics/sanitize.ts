/**
 * ============================================================================
 * Ressy — Filtro anti-PII: EL ÚNICO punto donde se decide qué sale a PostHog
 * ============================================================================
 * La garantía "nunca enviamos PII" no es "tener cuidado en cada call site": es
 * ESTRUCTURAL. Todo evento (client y server) pasa por `sanitize()` antes de
 * salir. La regla es una allowlist: solo las keys explícitamente permitidas
 * —todas identificadores/enums/booleanos/números por diseño— sobreviven;
 * cualquier otra se descarta. Aunque alguien agregue por error
 * `customer_email` a un payload, nunca llega a la red.
 *
 * Isomórfico (sin SDK): idéntico en client y server.
 * ============================================================================
 */

import type { CommonProps } from './events';

/**
 * Keys permitidas. Es la UNIÓN de todas las propiedades del catálogo
 * (`events.ts`) + las comunes. Cada una es no-PII por construcción. Agregar una
 * propiedad nueva a un evento obliga a sumarla acá — el olvido es seguro (la
 * propiedad simplemente no se envía, nunca se filtra un dato).
 */
export const ALLOWED_PROPERTY_KEYS = new Set<string>([
  // Comunes
  'business_id',
  'plan',
  'locale',
  'country',
  // Específicas de eventos
  'method',
  'step',
  'channel',
  'origin',
  'with_deposit',
  'by',
  'kind',
  'reason',
  'cycle',
  'previous_plan',
  'new_plan',
  'limit',
  'from',
]);

/**
 * Solo se permiten valores PRIMITIVOS serializables. Objetos y arrays podrían
 * esconder PII en estructuras anidadas ⇒ se descartan de raíz.
 */
function isAllowedValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Heurística DEFENSIVA (solo dev): avisa si un valor "parece" un email o
 * teléfono. No es la barrera —esa es el allowlist— sino una alarma temprana por
 * si una key permitida recibiera contenido inesperado.
 */
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(?:\+?\d[\s\-().]?){7,}/;

function looksLikePii(value: string): boolean {
  return EMAIL_RE.test(value) || PHONE_RE.test(value);
}

function warn(msg: string): void {
  // Solo ruido en dev/test; en prod el evento igual sale saneado.
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(`[analytics] ${msg}`);
  }
}

/**
 * Devuelve una copia del payload con SOLO las keys permitidas y valores
 * primitivos. Descarta lo demás (avisando en dev). Este es el borde que separa
 * "datos de Ressy" de "datos personales de terceros".
 */
export function sanitize(props: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!props) return out;

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    if (!ALLOWED_PROPERTY_KEYS.has(key)) {
      warn(`propiedad "${key}" descartada (no está en el allowlist)`);
      continue;
    }
    if (!isAllowedValue(value)) {
      warn(`propiedad "${key}" descartada (valor no primitivo)`);
      continue;
    }
    if (typeof value === 'string' && looksLikePii(value)) {
      // Extremadamente improbable con el catálogo actual; si pasa, es un bug.
      warn(`propiedad "${key}" descartada (parece PII)`);
      continue;
    }
    out[key] = value;
  }

  return out;
}

/** Type guard reutilizable por los tests: ¿son estas props 100% allowlist? */
export function isSanitized(props: CommonProps & Record<string, unknown>): boolean {
  return Object.keys(props).every((k) => ALLOWED_PROPERTY_KEYS.has(k));
}
