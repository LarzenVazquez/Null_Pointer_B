import { afterAll } from "vitest";
import { prisma } from "../../src/lib/prisma";

// Protección: estas pruebas borran datos, así que solo corren contra una base local de pruebas.
const url = process.env.DATABASE_URL ?? "";
if (url.includes("neon.tech") || !/localhost|127\.0\.0\.1/.test(url)) {
  throw new Error(`Las pruebas de integración solo se ejecutan contra una base local. DATABASE_URL=${url}`);
}

afterAll(async () => {
  await prisma.$disconnect();
});
