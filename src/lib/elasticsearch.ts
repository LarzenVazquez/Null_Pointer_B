import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
});

export const ES_INDICES = {
  usuarios: "np_usuarios",
  configuracion: "np_configuracion",
} as const;

export async function asegurarIndices(): Promise<void> {
  const existeUsuarios = await esClient.indices.exists({
    index: ES_INDICES.usuarios,
  });
  if (!existeUsuarios.body) {
    await esClient.indices.create({
      index: ES_INDICES.usuarios,
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            nombre: { type: "text" },
            email: { type: "text" },
            telefono: { type: "text" },
            roles: { type: "keyword" },
            activo: { type: "boolean" },
          },
        },
      },
    });
    console.log(`[search] Indice ${ES_INDICES.usuarios} creado.`);
  }

  const existeConfig = await esClient.indices.exists({
    index: ES_INDICES.configuracion,
  });
  if (!existeConfig.body) {
    await esClient.indices.create({
      index: ES_INDICES.configuracion,
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            tipo: { type: "keyword" },
            nombre: { type: "text" },
            descripcion: { type: "text" },
          },
        },
      },
    });
    console.log(`[search] Indice ${ES_INDICES.configuracion} creado.`);
  }
}
