import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function main() {
  // Verifica la conexión a PostgreSQL antes de aceptar tráfico.
  await prisma.$connect();
  console.log("[db] Conexión a PostgreSQL establecida");

  const servidor = app.listen(env.PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${env.PORT}`);
    console.log(`[server] Entorno: ${env.NODE_ENV}`);
    console.log(`[server] CORS habilitado para: ${env.FRONTEND_URL}`);
  });

  // Apagado ordenado (cierra conexiones antes de terminar el proceso).
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
