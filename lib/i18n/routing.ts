import { defineRouting } from 'next-intl/routing';

/**
 * CLAUDE.md §2: rutas `/es` y `/en`.
 * El default se negocia por `Accept-Language` (localeDetection), con `es` como
 * fallback cuando el header no matchea ninguno de los soportados.
 */
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localeDetection: true,
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
