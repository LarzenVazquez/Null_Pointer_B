import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  console.log("Creando salas iniciales...");

  // El campo `imagenUrl` guarda la ruta/link de la imagen de la sala.
  // Puede ser un link externo (como aquí, para el seed inicial) o una ruta
  // relativa gestionada por el backend, p. ej. "/uploads/salas/archivo.jpg",
  // que se genera automáticamente al subir un archivo desde el panel admin.
  const salasIniciales = [
    {
      id: "A",
      nombre: "Sala A",
      precio: 150,
      capacidad: 6,
      m2: 40,
      badge: "popular",
      badgeLabel: "Más popular",
      featured: true,
      descripcion:
        "Nuestra sala premium con cabina de control independiente. Ideal para bandas completas y sesiones de grabacion de alta exigencia.",
      equipo: [
        "Bateria Pearl Export Pro + Zildjian A",
        "Monitoreo independiente por zona",
        "Cabina de control",
        "Marshall DSL40CR + Ampeg BA-210",
      ],
      imagenUrl: "https://images.pexels.com/photos/5711950/pexels-photo-5711950.jpeg",
    },
    {
      id: "B",
      nombre: "Sala B",
      precio: 110,
      capacidad: 4,
      m2: 28,
      badge: "pro",
      badgeLabel: "PRO",
      featured: false,
      descripcion:
        "Sala profesional con mesa de mezcla digital de 32 canales. Perfecta para bandas de 4 elementos que buscan sonido de estudio.",
      equipo: [
        "Bateria Mapex Saturn",
        "Mesa Behringer X32 (32ch)",
        "PA JBL profesional",
        "Amplificadores Marshall + Ampeg",
      ],
      imagenUrl: "https://images.pexels.com/photos/33188274/pexels-photo-33188274.jpeg",
    },
    {
      id: "C",
      nombre: "Sala C",
      precio: 80,
      capacidad: 3,
      m2: 18,
      badge: "std",
      badgeLabel: "STD",
      featured: false,
      descripcion:
        "Sala estandar ideal para trios, duos o solistas. El mejor costo-beneficio para ensayos regulares.",
      equipo: [
        "Bateria Pearl Roadshow",
        "Amplificadores basicos",
        "Monitor de retorno",
        "Ideal para grupos de hasta 3",
      ],
      imagenUrl: "https://images.pexels.com/photos/8197270/pexels-photo-8197270.jpeg",
    },
  ];

  for (const s of salasIniciales) {
    await prisma.sala.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }
  console.log(`${salasIniciales.length} salas creadas/actualizadas.`);

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
