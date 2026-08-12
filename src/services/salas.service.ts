import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { eliminarArchivoDeImagen } from "../middlewares/upload.middleware";
import type {
  CrearSalaInput,
  ActualizarSalaInput,
} from "../validators/salas.validators";

function serializar(sala: any) {
  return {
    id: sala.id,
    name: sala.nombre,
    precio: sala.precio,
    capacidad: sala.capacidad,
    m2: sala.m2,
    badge: sala.badge,
    badgeLabel: sala.badgeLabel,
    featured: sala.featured,
    descripcion: sala.descripcion,
    equipo: sala.equipo,
    imagenUrl: sala.imagenUrl ?? null,
  };
}

function normalizarId(nombre: string): string {
  return (
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 30) || "sala"
  );
}

async function generarIdUnico(nombre: string): Promise<string> {
  const base = normalizarId(nombre);
  let candidato = base;
  let sufijo = 1;

  while (await prisma.sala.findUnique({ where: { id: candidato } })) {
    sufijo += 1;
    candidato = `${base}-${sufijo}`;
  }

  return candidato;
}

export async function listarSalas() {
  const salas = await prisma.sala.findMany({ orderBy: { id: "asc" } });
  return salas.map(serializar);
}

export async function obtenerSalaPorId(id: string) {
  const sala = await prisma.sala.findUnique({ where: { id } });
  if (!sala) throw ApiError.noEncontrado(`No existe una sala con id '${id}'`);
  return serializar(sala);
}

export async function crearSala(
  datos: CrearSalaInput,
  imagenSubidaUrl?: string,
) {
  const id = datos.id?.trim() || (await generarIdUnico(datos.nombre));

  const existente = await prisma.sala.findUnique({ where: { id } });
  if (existente) {
    throw ApiError.conflicto(`Ya existe una sala con id '${id}'`);
  }

  const sala = await prisma.sala.create({
    data: {
      id,
      nombre: datos.nombre,
      precio: datos.precio,
      capacidad: datos.capacidad,
      m2: datos.m2,
      badge: datos.badge,
      badgeLabel: datos.badgeLabel,
      featured: datos.featured ?? false,
      descripcion: datos.descripcion,
      equipo: datos.equipo,
      imagenUrl: imagenSubidaUrl ?? datos.imagenUrl ?? null,
    },
  });

  return serializar(sala);
}

export async function actualizarSala(
  id: string,
  cambios: ActualizarSalaInput,
  imagenSubidaUrl?: string,
) {
  const salaActual = await prisma.sala.findUnique({ where: { id } });
  if (!salaActual)
    throw ApiError.noEncontrado(`No existe una sala con id '${id}'`);

  if (imagenSubidaUrl && salaActual.imagenUrl) {
    eliminarArchivoDeImagen(salaActual.imagenUrl);
  }

  const sala = await prisma.sala.update({
    where: { id },
    data: {
      ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
      ...(cambios.precio !== undefined ? { precio: cambios.precio } : {}),
      ...(cambios.capacidad !== undefined
        ? { capacidad: cambios.capacidad }
        : {}),
      ...(cambios.m2 !== undefined ? { m2: cambios.m2 } : {}),
      ...(cambios.badge !== undefined ? { badge: cambios.badge } : {}),
      ...(cambios.badgeLabel !== undefined
        ? { badgeLabel: cambios.badgeLabel }
        : {}),
      ...(cambios.featured !== undefined ? { featured: cambios.featured } : {}),
      ...(cambios.descripcion !== undefined
        ? { descripcion: cambios.descripcion }
        : {}),
      ...(cambios.equipo !== undefined ? { equipo: cambios.equipo } : {}),
      ...(imagenSubidaUrl
        ? { imagenUrl: imagenSubidaUrl }
        : cambios.imagenUrl !== undefined
          ? { imagenUrl: cambios.imagenUrl || null }
          : {}),
    },
  });

  return serializar(sala);
}

export async function eliminarSala(id: string, forzar = false) {
  const sala = await prisma.sala.findUnique({ where: { id } });
  if (!sala) throw ApiError.noEncontrado(`No existe una sala con id '${id}'`);

  if (!forzar) {
    const [reservasCount, favoritosCount] = await Promise.all([
      prisma.reserva.count({ where: { salaId: id } }),
      prisma.favorito.count({ where: { salaId: id } }),
    ]);

    if (reservasCount > 0) {
      throw ApiError.conflicto(
        `No se puede eliminar la sala: tiene ${reservasCount} reserva(s) asociada(s). Cancélalas primero o usa la eliminación forzada.`,
      );
    }
    if (favoritosCount > 0) {
    }
  }

  await prisma.sala.delete({ where: { id } });
  eliminarArchivoDeImagen(sala.imagenUrl);

  return { id };
}
