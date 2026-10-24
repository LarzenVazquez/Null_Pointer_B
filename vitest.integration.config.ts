import { defineConfig } from "vitest/config";

// Pruebas de integración: Express + servicios + Prisma + PostgreSQL REAL (base de datos de pruebas).
// La URL se toma de TEST_DATABASE_URL; nunca se usa la DATABASE_URL de Neon.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/np_test";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 20_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "secreto-solo-para-pruebas-de-integracion",
      ELASTICSEARCH_URL: "http://localhost:9200",
      VINCULACION_EXPIRA_MINUTOS: "10",
    },
  },
});
