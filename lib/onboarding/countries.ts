/**
 * País → timezone IANA + moneda ISO por defecto. El wizard deriva estos dos del
 * país elegido (paso 1) y deja ambos AJUSTABLES en sus propios selects, porque un
 * país puede tener varias zonas (México, Chile continental vs. isla) y algunos
 * negocios cobran en otra moneda (turismo en USD).
 *
 * No es exhaustivo: cubre los mercados de arranque (LATAM + US + España). Agregar
 * un país es una línea aquí.
 */

export interface Country {
  code: string;
  nameEs: string;
  nameEn: string;
  timezone: string;
  currency: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CL', nameEs: 'Chile', nameEn: 'Chile', timezone: 'America/Santiago', currency: 'CLP' },
  {
    code: 'MX',
    nameEs: 'México',
    nameEn: 'Mexico',
    timezone: 'America/Mexico_City',
    currency: 'MXN',
  },
  {
    code: 'CO',
    nameEs: 'Colombia',
    nameEn: 'Colombia',
    timezone: 'America/Bogota',
    currency: 'COP',
  },
  {
    code: 'AR',
    nameEs: 'Argentina',
    nameEn: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    currency: 'ARS',
  },
  { code: 'PE', nameEs: 'Perú', nameEn: 'Peru', timezone: 'America/Lima', currency: 'PEN' },
  { code: 'ES', nameEs: 'España', nameEn: 'Spain', timezone: 'Europe/Madrid', currency: 'EUR' },
  {
    code: 'US',
    nameEs: 'Estados Unidos',
    nameEn: 'United States',
    timezone: 'America/New_York',
    currency: 'USD',
  },
  {
    code: 'BR',
    nameEs: 'Brasil',
    nameEn: 'Brazil',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
  },
  {
    code: 'UY',
    nameEs: 'Uruguay',
    nameEn: 'Uruguay',
    timezone: 'America/Montevideo',
    currency: 'UYU',
  },
];

/** Zonas IANA ofrecidas en el select ajustable. El label (GMT±) se calcula en la UI. */
export const TIMEZONES: string[] = [
  'America/Santiago',
  'America/Mexico_City',
  'America/Bogota',
  'America/Argentina/Buenos_Aires',
  'America/Lima',
  'America/Sao_Paulo',
  'America/Montevideo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'Atlantic/Canary',
  'Pacific/Easter',
];

/** Monedas ISO 4217 ofrecidas. El símbolo/nombre lo formatea Intl. */
export const CURRENCIES: string[] = [
  'CLP',
  'MXN',
  'COP',
  'ARS',
  'PEN',
  'BRL',
  'UYU',
  'USD',
  'EUR',
  'GBP',
];

/** Categorías de negocio del mockup. Se guardan como la clave (string libre en DB). */
export const CATEGORIES = [
  'barbershop',
  'hair_salon',
  'spa',
  'clinic',
  'fitness',
  'tattoo',
  'legal',
  'other',
] as const;

export type CategoryKey = (typeof CATEGORIES)[number];

export function countryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
