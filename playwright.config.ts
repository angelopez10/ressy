import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de la booking page contra la DB hosted (el seed). Levanta el dev server de
 * Next y lo maneja con Chromium. Los tests de UNIDAD del motor siguen en Vitest;
 * Playwright es solo para el flujo de reserva end-to-end (CLAUDE.md §6).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Graba video de cada test. Viewport tipo móvil: la booking page es
    // mobile-first, así el video muestra la pantalla como la ve el cliente real.
    video: { mode: 'on', size: { width: 390, height: 844 } },
    viewport: { width: 390, height: 844 },
    launchOptions: { slowMo: 350 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/es/barberia-el-corte',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
