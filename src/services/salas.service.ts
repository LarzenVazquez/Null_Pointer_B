import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

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
  };
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

export async function actualizarSala(
  id: string,
  cambios: { precio?: number; badgeLabel?: string; descripcion?: string }
) {
  await obtenerSalaPorId(id);

  const sala = await prisma.sala.update({
    where: { id },
    data: {
      ...(cambios.precio !== undefined ? { precio: cambios.precio } : {}),
      ...(cambios.badgeLabel !== undefined ? { badgeLabel: cambios.badgeLabel } : {}),
      ...(cambios.descripcion !== undefined ? { descripcion: cambios.descripcion } : {}),
    },
  });

  return serializar(sala);
}
