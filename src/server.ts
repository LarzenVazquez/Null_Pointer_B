import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { asegurarIndices } from "./lib/elasticsearch";

async function main() {
  await prisma.$connect();
  console.log("[db] Conexión a PostgreSQL establecida");
  try {
    await asegurarIndices();
    console.log("[search] Índices de Elasticsearch listos");
  } catch (err) {
    console.warn(
      "[search] No se pudo conectar a Elasticsearch. El buscador global no funcionará hasta que esté disponible.",
      err,
    );
  }

  const servidor = app.listen(env.PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${env.PORT}`);
    console.log(`[server] Entorno: ${env.NODE_ENV}`);
    console.log(`[server] CORS habilitado para: ${env.FRONTEND_URL}`);
  });

  const apagar = async (señal: string) => {
    console.log(`\n[server] Señal ${señal} recibida, cerrando...`);
    servidor.close(async () => {
      await prisma.$disconnect();
      console.log("[server] Cerrado correctamente");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => apagar("SIGINT"));
  process.on("SIGTERM", () => apagar("SIGTERM"));
}

main().catch((err) => {
  console.error("[server] Error fatal al iniciar:", err);
  process.exit(1);
});
