import { asegurarIndices } from "../src/lib/elasticsearch";
import {
  reindexarTodosLosUsuarios,
  reindexarConfiguracion,
} from "../src/services/search.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("[reindex] Asegurando índices...");
  await asegurarIndices();

  console.log("[reindex] Indexando usuarios...");
  const total = await reindexarTodosLosUsuarios();
  console.log(`[reindex] ${total} usuario(s) indexado(s)`);

  console.log("[reindex] Indexando roles y permisos...");
  await reindexarConfiguracion();
  console.log("[reindex] Listo.");
}

main()
  .catch((err) => {
    console.error("[reindex] Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
