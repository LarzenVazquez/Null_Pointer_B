import { defineConfig } from "vitest/config";

// Pruebas unitarias: sin base de datos ni red. Prisma se reemplaza por dobles de prueba.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://unit:unit@localhost:5432/no-se-usa",
      JWT_SECRET: "secreto-solo-para-pruebas-unitarias",
      ELASTICSEARCH_URL: "http://localhost:9200",
      VINCULACION_EXPIRA_MINUTOS: "10",
    },
  },
});
