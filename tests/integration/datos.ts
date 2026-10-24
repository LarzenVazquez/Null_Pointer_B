import { prisma } from "../../src/lib/prisma";
import { firmarAccessToken } from "../../src/utils/jwt.utils";

/** Deja la base de pruebas vacía y crea los datos mínimos (sin información real). */
export async function prepararBase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE notificaciones, disp_wearables, vinculaciones_wearable, reservas, favoritos,
      mensajes, sesiones, usuario_rol, usuarios, salas, roles RESTART IDENTITY CASCADE
  `);
  const [rolUsuario, rolAdmin] = await Promise.all([
    prisma.rol.create({ data: { nombre: "Usuario" } }),
    prisma.rol.create({ data: { nombre: "Administrador" } }),
  ]);
  const usuaria = await prisma.usuario.create({
    data: {
      nombre: "Usuaria de Prueba",
      email: "usuaria.prueba@example.test",
      telefono: "4420000000",
      passwordHash: "no-se-usa",
      roles: { create: { rolId: rolUsuario.id } },
    },
  });
  const admin = await prisma.usuario.create({
    data: {
      nombre: "Admin de Prueba",
      email: "admin.prueba@example.test",
      telefono: "4420000001",
      passwordHash: "no-se-usa",
      roles: { create: { rolId: rolAdmin.id } },
    },
  });
  await prisma.sala.create({
    data: { id: "A", nombre: "Sala A", precio: 150, capacidad: 6, m2: 40, badge: "std", badgeLabel: "STD", descripcion: "Sala de pruebas", equipo: [] },
  });
  return { usuaria, admin };
}

export function tokenWeb(u: { id: number; email: string; nombre: string }, rol: string) {
  return firmarAccessToken({ sub: u.id, email: u.email, nombre: u.nombre, roles: [rol], permisos: [] });
}
