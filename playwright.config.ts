import { defineConfig } from "@playwright/test";

/**
 * Prueba E2E del flujo de vinculación: navegador (plataforma web) + reloj (cliente HTTP con las
 * mismas llamadas que hace la app de Wear OS) + backend + PostgreSQL.
 *
 * Requiere, antes de ejecutar `npm run test:e2e`:
 *   - Backend local apuntando a una base de pruebas con el seed cargado (E2E_API_URL).
 *   - Frontend Angular en modo desarrollo (E2E_WEB_URL), que usa http://localhost:3000/api.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? "http://localhost:4200",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "tests/e2e/resultados",
});
