import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { firmarAccessToken } from "../utils/jwt.utils";
import { calcularFingerprintPassword } from "../utils/passwordFingerprint.utils";
import {
  generarRefreshToken,
  hashRefreshToken,
} from "../utils/refreshToken.utils";
import type { LoginInput, RegistroInput } from "../validators/auth.validators";

const ROL_POR_DEFECTO = "Usuario";

interface UsuarioRolConPermisos {
  rol: {
    nombre: string;
    permisos: { permiso: { nombre: string } }[];
  };
}

async function obtenerRolesYPermisos(usuarioId: number) {
  const usuarioConRoles = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: {
      roles: {
        include: {
          rol: {
            include: {
              permisos: { include: { permiso: true } },
            },
          },
        },
      },
    },
  });

  if (!usuarioConRoles) throw ApiError.noEncontrado("Usuario no encontrado");

  const roles = usuarioConRoles.roles.map(
    (ur: UsuarioRolConPermisos) => ur.rol.nombre
  );
  const permisosSet = new Set<string>();
  for (const ur of usuarioConRoles.roles as UsuarioRolConPermisos[]) {
    for (const rp of ur.rol.permisos) {
      permisosSet.add(rp.permiso.nombre);
    }
  }

  return {
    usuario: usuarioConRoles,
    roles,
    permisos: Array.from(permisosSet),
  };
}

function datosPublicosUsuario(usuario: {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  createdAt: Date;
}) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono ?? undefined,
    activo: usuario.activo,
    createdAt: usuario.createdAt,
  };
}

export async function registrarUsuario(datos: RegistroInput) {
  const existente = await prisma.usuario.findUnique({
    where: { email: datos.email },
  });
  if (existente) {
    throw ApiError.conflicto("Ya existe una cuenta registrada con ese correo");
  }

  const rolUsuario = await prisma.rol.findUnique({
    where: { nombre: ROL_POR_DEFECTO },
  });
  if (!rolUsuario) {

    throw ApiError.interno(
      "No se encontró el rol por defecto. Ejecuta el seed de la base de datos."
    );
  }

  const passwordFingerprint = calcularFingerprintPassword(datos.password);
  const passwordRepetida = await prisma.usuario.findUnique({
    where: { passwordFingerprint },
  });
  if (passwordRepetida) {
    throw ApiError.conflicto(
      "Esa contraseña ya está en uso por otra cuenta. Por seguridad, elige una contraseña diferente."
    );
  }

  const passwordHash = await bcrypt.hash(
    datos.password,
    env.BCRYPT_SALT_ROUNDS
  );

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      passwordHash,
      passwordFingerprint,
      roles: { create: { rolId: rolUsuario.id } },
    },
  });

  return datosPublicosUsuario(nuevoUsuario);
}

export async function iniciarSesion(
  datos: LoginInput,
  contexto: { userAgent?: string; ip?: string }
) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: datos.email },
  });

  const credencialesInvalidas = () =>
    ApiError.noAutorizado("Correo o contraseña incorrectos");

  if (!usuario) throw credencialesInvalidas();
  if (!usuario.activo) {
    throw ApiError.prohibido(
      "Esta cuenta está deshabilitada. Contacta a un administrador."
    );
  }

  const passwordValido = await bcrypt.compare(
    datos.password,
    usuario.passwordHash
  );
  if (!passwordValido) throw credencialesInvalidas();

  // Cuentas creadas antes de la restricción de unicidad todavía no tienen
  // huella de contraseña; se calcula y guarda de forma perezosa en su
  // primer login exitoso. Si por una coincidencia extremadamente rara ya
  // existe otra cuenta con esa misma huella, se ignora en silencio: no debe
  // impedir el login de un usuario legítimo.
  if (!usuario.passwordFingerprint) {
    const passwordFingerprint = calcularFingerprintPassword(datos.password);
    try {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordFingerprint },
      });
    } catch {
      // Colisión con una cuenta existente: se deja sin huella por ahora.
    }
  }

  const { roles, permisos } = await obtenerRolesYPermisos(usuario.id);

  const accessToken = firmarAccessToken({
    sub: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    roles,
    permisos,
  });

  const refreshTokenPlano = generarRefreshToken();
  const expiraEn = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.sesion.create({
    data: {
      usuarioId: usuario.id,
      refreshToken: hashRefreshToken(refreshTokenPlano),
      userAgent: contexto.userAgent,
      ip: contexto.ip,
      expiraEn,
    },
  });

  return {
    usuario: { ...datosPublicosUsuario(usuario), roles, permisos },
    accessToken,
    refreshTokenPlano,
  };
}

export async function refrescarSesion(
  refreshTokenPlano: string,
  contexto: { userAgent?: string; ip?: string }
) {
  const hash = hashRefreshToken(refreshTokenPlano);

  const sesion = await prisma.sesion.findUnique({
    where: { refreshToken: hash },
    include: { usuario: true },
  });

  if (!sesion || !sesion.valida) {
    throw ApiError.noAutorizado("Sesión inválida, inicia sesión nuevamente");
  }

  if (sesion.expiraEn < new Date()) {
    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { valida: false },
    });
    throw ApiError.noAutorizado("La sesión expiró, inicia sesión nuevamente");
  }

  if (!sesion.usuario.activo) {
    throw ApiError.prohibido("Esta cuenta está deshabilitada.");
  }

  await prisma.sesion.update({
    where: { id: sesion.id },
    data: { valida: false },
  });

  const { roles, permisos } = await obtenerRolesYPermisos(sesion.usuario.id);

  const nuevoRefreshPlano = generarRefreshToken();
  const expiraEn = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.sesion.create({
    data: {
      usuarioId: sesion.usuario.id,
      refreshToken: hashRefreshToken(nuevoRefreshPlano),
      userAgent: contexto.userAgent,
      ip: contexto.ip,
      expiraEn,
    },
  });

  const accessToken = firmarAccessToken({
    sub: sesion.usuario.id,
    email: sesion.usuario.email,
    nombre: sesion.usuario.nombre,
    roles,
    permisos,
  });

  return {
    usuario: { ...datosPublicosUsuario(sesion.usuario), roles, permisos },
    accessToken,
    refreshTokenPlano: nuevoRefreshPlano,
  };
}

export async function cerrarSesion(refreshTokenPlano: string | undefined) {
  if (!refreshTokenPlano) return;
  const hash = hashRefreshToken(refreshTokenPlano);
  await prisma.sesion.updateMany({
    where: { refreshToken: hash },
    data: { valida: false },
  });
}

export async function cerrarTodasLasSesiones(usuarioId: number) {
  await prisma.sesion.updateMany({
    where: { usuarioId, valida: true },
    data: { valida: false },
  });
}

export async function obtenerPerfil(usuarioId: number) {
  const { usuario, roles, permisos } = await obtenerRolesYPermisos(usuarioId);
  return { ...datosPublicosUsuario(usuario), roles, permisos };
}

export async function actualizarPerfilPropio(
  usuarioId: number,
  cambios: { nombre?: string; telefono?: string }
) {
  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data: cambios,
  });
  const { roles, permisos } = await obtenerRolesYPermisos(usuarioId);
  return { ...datosPublicosUsuario(usuario), roles, permisos };
}
