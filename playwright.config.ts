import { defineConfig } from "@playwright/test";

/**
 * Tests de punta a punta contra la app real (dev server + Supabase).
 * Usa el Chrome instalado (channel "chrome"): no descarga navegadores.
 * Credenciales demo: supabase/seed/02_demo.sql (sobrescribibles por env).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 390, height: 844 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
