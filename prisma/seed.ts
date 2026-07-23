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

  console.log("Creando usuarios iniciales...");

  const usuariosIniciales = [
    {
      email: "admin@nullpointer.mx",
      password: "Admin123!",
      rol: "Administrador",
    },
    { email: "editor@nullpointer.mx", password: "Editor123!", rol: "Editor" },
    {
      email: "cliente@nullpointer.mx",
      password: "Cliente123!",
      rol: "Usuario",
    },
  ];

  for (const u of usuariosIniciales) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: {
        nombre: u.email.split("@")[0],
        email: u.email,
        passwordHash,
      },
    });

    await prisma.usuarioRol.upsert({
      where: {
        usuarioId_rolId: {
          usuarioId: usuario.id,
          rolId: rolesCreados[u.rol].id,
        },
      },
      update: {},
      create: {
        usuarioId: usuario.id,
        rolId: rolesCreados[u.rol].id,
      },
    });
    console.log(`Usuario ${u.email} creado con rol ${u.rol}.`);
  }

  console.log("Seed completado.");
  console.log("Credenciales de prueba:");
  for (const u of usuariosIniciales) {
    console.log(`  ${u.rol.padEnd(13)} -> ${u.email}  /  ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
