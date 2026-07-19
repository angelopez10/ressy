import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// El motor de disponibilidad usa el alias `@/` igual que el resto del repo
// (tsconfig.json). Vitest no lee el tsconfig, así que lo replicamos aquí.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Las guardas `server-only`/`client-only` son del bundler de Next; en los
      // tests de Node apuntan a un módulo vacío para poder importar código de
      // servidor (dispatch de notificaciones, etc.).
      'server-only': fileURLToPath(new URL('./lib/testing/empty.ts', import.meta.url)),
      'client-only': fileURLToPath(new URL('./lib/testing/empty.ts', import.meta.url)),
    },
  },
  test: {
    // Los tests del motor son puros y deterministas: no tocan la DB ni el reloj
    // real (el `now` se inyecta). Node basta, no hace falta jsdom.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
