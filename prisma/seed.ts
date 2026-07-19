import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando roles...");

  const nombresRoles = ["Administrador", "Editor", "Usuario"] as const;
  const rolesCreados: Record<string, { id: number }> = {};

  for (const nombre of nombresRoles) {
    const rol = await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    rolesCreados[nombre] = rol;
  }

  console.log("Sembrando permisos...");

  const nombresPermisos = [
    "usuarios.ver",
    "usuarios.crear",
    "usuarios.editar",
    "usuarios.eliminar",
    "salas.ver",
    "salas.crear",
    "salas.editar",
    "salas.eliminar",
    "reservas.ver",
    "reservas.crear",
  ];

  const permisosCreados: Record<string, { id: number }> = {};

  for (const nombre of nombresPermisos) {
    const permiso = await prisma.permiso.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    permisosCreados[nombre] = permiso;
  }

  console.log("Asignando permisos a roles...");

  // Administrador: todos los permisos
  for (const permiso of Object.values(permisosCreados)) {
    await prisma.rolPermiso.upsert({
      where: {
        rolId_permisoId: {
          rolId: rolesCreados["Administrador"].id,
          permisoId: permiso.id,
        },
      },
      update: {},
      create: {
        rolId: rolesCreados["Administrador"].id,
        permisoId: permiso.id,
      },
    });
  }

  // Editor: gestion parcial (salas, reservas) + ver usuarios
  const permisosEditor = [
    "usuarios.ver",
    "salas.ver",
    "salas.crear",
    "salas.editar",
    "reservas.ver",
    "reservas.crear",
  ];

  for (const nombrePermiso of permisosEditor) {
    await prisma.rolPermiso.upsert({
      where: {
        rolId_permisoId: {
          rolId: rolesCreados["Editor"].id,
          permisoId: permisosCreados[nombrePermiso].id,
        },
      },
      update: {},
      create: {
        rolId: rolesCreados["Editor"].id,
        permisoId: permisosCreados[nombrePermiso].id,
      },
    });
  }

  // Usuario: solo lectura y crear su propia reserva
  const permisosUsuario = ["salas.ver", "reservas.ver", "reservas.crear"];

  for (const nombrePermiso of permisosUsuario) {
    await prisma.rolPermiso.upsert({
      where: {
        rolId_permisoId: {
          rolId: rolesCreados["Usuario"].id,
          permisoId: permisosCreados[nombrePermiso].id,
        },
      },
      update: {},
      create: {
        rolId: rolesCreados["Usuario"].id,
        permisoId: permisosCreados[nombrePermiso].id,
      },
    });
  }

  console.log("Creando usuario administrador por defecto...");

  const passwordHash = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "[email protected]" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "[email protected]",
      passwordHash,
    },
  });

  await prisma.usuarioRol.upsert({
    where: {
      usuarioId_rolId: {
        usuarioId: admin.id,
        rolId: rolesCreados["Administrador"].id,
      },
    },
    update: {},
    create: {
      usuarioId: admin.id,
      rolId: rolesCreados["Administrador"].id,
    },
  });

  console.log("Seed completado.");
  console.log("Usuario admin -> email: [email protected]  password: Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
