import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

function serializar(usuario: any) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono ?? undefined,
    activo: usuario.activo,
    createdAt: usuario.createdAt,
    roles: usuario.roles?.map((ur: any) => ur.rol.nombre) ?? [],
  };
}

const includeRoles = {
  roles: { include: { rol: true } },
} as const;

export async function listarUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    include: includeRoles,
    orderBy: { createdAt: "desc" },
  });
  return usuarios.map(serializar);
}

export async function obtenerUsuarioPorId(id: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: includeRoles,
  });
  if (!usuario) throw ApiError.noEncontrado("Usuario no encontrado");
  return serializar(usuario);
}

export async function crearUsuarioComoAdmin(datos: {
  nombre: string;
  email: string;
  telefono?: string;
  password: string;
  rol: "Administrador" | "Editor" | "Usuario";
}) {
  const existente = await prisma.usuario.findUnique({
    where: { email: datos.email },
  });
  if (existente) throw ApiError.conflicto("Ese correo ya está registrado");

  const rol = await prisma.rol.findUnique({ where: { nombre: datos.rol } });
  if (!rol) throw ApiError.badRequest("El rol indicado no existe");

  const passwordHash = await bcrypt.hash(
    datos.password,
    env.BCRYPT_SALT_ROUNDS
  );

  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      passwordHash,
      roles: { create: { rolId: rol.id } },
    },
    include: includeRoles,
  });

  return serializar(usuario);
}

export async function actualizarUsuario(
  id: number,
  cambios: { nombre?: string; telefono?: string; activo?: boolean }
) {
  await asegurarExiste(id);
  const usuario = await prisma.usuario.update({
    where: { id },
    data: cambios,
    include: includeRoles,
  });
  return serializar(usuario);
}

export async function eliminarUsuario(id: number) {
  await asegurarExiste(id);
  await prisma.usuario.delete({ where: { id } });
}

/**
 * Cambia el rol de un usuario. Un usuario en este esquema puede tener
 * varios roles (tabla N:M), pero para esta práctica se maneja como
 * "un rol activo a la vez": se reemplaza cualquier rol previo.
 */
export async function cambiarRolUsuario(
  id: number,
  nombreRol: "Administrador" | "Editor" | "Usuario"
) {
  await asegurarExiste(id);

  const rol = await prisma.rol.findUnique({ where: { nombre: nombreRol } });
  if (!rol) throw ApiError.badRequest("El rol indicado no existe");

  await prisma.$transaction([
    prisma.usuarioRol.deleteMany({ where: { usuarioId: id } }),
    prisma.usuarioRol.create({ data: { usuarioId: id, rolId: rol.id } }),
  ]);

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: includeRoles,
  });
  return serializar(usuario);
}

async function asegurarExiste(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw ApiError.noEncontrado("Usuario no encontrado");
}
