import { esClient, ES_INDICES } from "../lib/elasticsearch";
import { prisma } from "../lib/prisma";

export async function indexUsuario(usuario: {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  activo: boolean;
  roles: string[];
}): Promise<void> {
  try {
    await esClient.index({
      index: ES_INDICES.usuarios,
      id: String(usuario.id),
      document: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono ?? "",
        roles: usuario.roles,
        activo: usuario.activo,
      },
    });
  } catch (error: any) {
    console.error(
      `[search] Advertencia: No se pudo indexar el usuario ${usuario.id} en Elasticsearch.`,
      error.message,
    );
  }
}

export async function removeUsuarioDelIndice(id: number): Promise<void> {
  try {
    await esClient.delete({ index: ES_INDICES.usuarios, id: String(id) });
  } catch (err: any) {
    if (err?.meta?.statusCode !== 404) throw err;
  }
}

export async function reindexarConfiguracion(): Promise<void> {
  const [roles, permisos] = await Promise.all([
    prisma.rol.findMany(),
    prisma.permiso.findMany(),
  ]);

  const operaciones = [
    ...roles.map((r) => ({
      id: `rol-${r.id}`,
      doc: {
        id: r.id,
        tipo: "rol" as const,
        nombre: r.nombre,
        descripcion: r.descripcion ?? "",
      },
    })),
    ...permisos.map((p) => ({
      id: `permiso-${p.id}`,
      doc: {
        id: p.id,
        tipo: "permiso" as const,
        nombre: p.nombre,
        descripcion: p.descripcion ?? "",
      },
    })),
  ];

  if (operaciones.length === 0) return;

  await esClient.bulk({
    refresh: true,
    operations: operaciones.flatMap(({ id, doc }) => [
      { index: { _index: ES_INDICES.configuracion, _id: id } },
      doc,
    ]),
  });
}

export async function reindexarTodosLosUsuarios(): Promise<number> {
  const usuarios = await prisma.usuario.findMany({
    include: { roles: { include: { rol: true } } },
  });

  if (usuarios.length === 0) return 0;

  await esClient.bulk({
    refresh: true,
    operations: usuarios.flatMap((u) => [
      { index: { _index: ES_INDICES.usuarios, _id: String(u.id) } },
      {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono ?? "",
        roles: u.roles.map((ur) => ur.rol.nombre),
        activo: u.activo,
      },
    ]),
  });

  return usuarios.length;
}

export interface ResultadoBusqueda {
  usuarios: any[];
  configuracion: any[];
}

export async function buscarGlobal(query: string): Promise<ResultadoBusqueda> {
  const texto = query.trim();
  if (!texto) return { usuarios: [], configuracion: [] };

  const [resUsuarios, resConfig] = await Promise.all([
    esClient.search({
      index: ES_INDICES.usuarios,
      query: {
        multi_match: {
          query: texto,
          fields: ["nombre", "email", "telefono"],
          fuzziness: "AUTO",
        },
      },
      size: 10,
    }),
    esClient.search({
      index: ES_INDICES.configuracion,
      query: {
        multi_match: {
          query: texto,
          fields: ["nombre", "descripcion"],
          fuzziness: "AUTO",
        },
      },
      size: 10,
    }),
  ]);

  return {
    usuarios: resUsuarios.hits.hits.map((h) => h._source),
    configuracion: resConfig.hits.hits.map((h) => h._source),
  };
}
