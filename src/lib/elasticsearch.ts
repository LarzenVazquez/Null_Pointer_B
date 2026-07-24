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
  if (!existeUsuarios) {
    await esClient.indices.create({
      index: ES_INDICES.usuarios,
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
    });
  }

  const existeConfig = await esClient.indices.exists({
    index: ES_INDICES.configuracion,
  });
  if (!existeConfig) {
    await esClient.indices.create({
      index: ES_INDICES.configuracion,
      mappings: {
        properties: {
          id: { type: "integer" },
          tipo: { type: "keyword" },
          nombre: { type: "text" },
          descripcion: { type: "text" },
        },
      },
    });
  }
}
