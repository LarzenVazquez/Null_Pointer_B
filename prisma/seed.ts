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
      imagenUrl:
        "https://images.pexels.com/photos/5711950/pexels-photo-5711950.jpeg",
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
      imagenUrl:
        "https://images.pexels.com/photos/33188274/pexels-photo-33188274.jpeg",
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
      imagenUrl:
        "https://images.pexels.com/photos/8197270/pexels-photo-8197270.jpeg",
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
      nombre: "Admin Principal",
      email: "admin@nullpointer.mx",
      telefono: "4421000001",
      password: "Admin123!",
      rol: "Administrador",
    },
    {
      nombre: "Sofía Hernández",
      email: "editor1@nullpointer.mx",
      telefono: "4421000002",
      password: "Editor123!",
      rol: "Editor",
    },
    {
      nombre: "Pedro Martínez",
      email: "editor2@nullpointer.mx",
      telefono: "4421000003",
      password: "Editor456!",
      rol: "Editor",
    },
    {
      nombre: "Laura Gómez",
      email: "Lau_Gomez88@gmail.com",
      telefono: "4421000004",
      password: "Laura88Go",
      rol: "Usuario",
    },
    {
      nombre: "Carlos Ramírez",
      email: "Carlos_Ram22@gmail.com",
      telefono: "4421000005",
      password: "Carlos22Rz",
      rol: "Usuario",
    },
    {
      nombre: "Mariana López",
      email: "Mari_Lopez07@gmail.com",
      telefono: "4421000006",
      password: "Mariana07Lp",
      rol: "Usuario",
    },
    {
      nombre: "Diego Torres",
      email: "Diego_Torres95@gmail.com",
      telefono: "4421000007",
      password: "Diego95Tr",
      rol: "Usuario",
    },
  ];

  const usuariosCreados: Record<string, { id: number }> = {};

  for (const u of usuariosIniciales) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {
        nombre: u.nombre,
        telefono: u.telefono,
        passwordHash,
      },
      create: {
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        passwordHash,
      },
    });
    usuariosCreados[u.email] = usuario;

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

  console.log("Creando reservas de ejemplo...");
  const catalogoServicios = {
    grabacion: { nombre: "Grabación de audio", precioUnitario: 350 },
    mastering: { nombre: "Mastering", precioUnitario: 450 },
    entrega_masters: { nombre: "Entrega de masters", precioUnitario: 80 },
  } as const;

  function construirServicio(
    id: keyof typeof catalogoServicios,
    cantidad: number,
  ) {
    const base = catalogoServicios[id];
    return {
      servicioId: id,
      nombre: base.nombre,
      cantidad,
      precioUnitario: base.precioUnitario,
      subtotal: base.precioUnitario * cantidad,
    };
  }

  const reservasIniciales = [
    {
      usuarioEmail: "Lau_Gomez88@gmail.com",
      salaId: "A",
      fecha: "2026-08-20",
      hora: "10:00",
      duracionHoras: 3,
      servicios: [construirServicio("grabacion", 3)],
      estado: "confirmada" as const,
      notas: "Ensayo con banda completa, requiere grabación de la sesión.",
    },
    {
      usuarioEmail: "Carlos_Ram22@gmail.com",
      salaId: "B",
      fecha: "2026-08-22",
      hora: "16:00",
      duracionHoras: 2,
      servicios: [],
      estado: "pendiente" as const,
      notas: undefined,
    },
    {
      usuarioEmail: "Mari_Lopez07@gmail.com",
      salaId: "C",
      fecha: "2026-07-30",
      hora: "12:00",
      duracionHoras: 2,
      servicios: [construirServicio("mastering", 2)],
      estado: "completada" as const,
      notas: "Masterización de 2 pistas del EP.",
    },
    {
      usuarioEmail: "Diego_Torres95@gmail.com",
      salaId: "A",
      fecha: "2026-08-25",
      hora: "18:00",
      duracionHoras: 4,
      servicios: [construirServicio("entrega_masters", 5)],
      estado: "cancelada" as const,
      notas: "Cancelada por el cliente, reprogramará más adelante.",
    },
  ];

  for (const r of reservasIniciales) {
    const usuario = usuariosCreados[r.usuarioEmail];
    const sala = salasIniciales.find((s) => s.id === r.salaId)!;

    const yaExiste = await prisma.reserva.findFirst({
      where: {
        usuarioId: usuario.id,
        salaId: r.salaId,
        fecha: r.fecha,
        hora: r.hora,
      },
    });
    if (yaExiste) {
      console.log(
        `Reserva de ${r.usuarioEmail} en Sala ${r.salaId} (${r.fecha} ${r.hora}) ya existe, se omite.`,
      );
      continue;
    }

    const precioSala = sala.precio * r.duracionHoras;
    const precioServicios = r.servicios.reduce((sum, s) => sum + s.subtotal, 0);

    await prisma.reserva.create({
      data: {
        usuarioId: usuario.id,
        salaId: r.salaId,
        fecha: r.fecha,
        hora: r.hora,
        duracionHoras: r.duracionHoras,
        precioSala,
        servicios: r.servicios,
        precioServicios,
        precioTotal: precioSala + precioServicios,
        estado: r.estado,
        notas: r.notas,
      },
    });
    console.log(
      `Reserva creada: ${r.usuarioEmail} -> Sala ${r.salaId} (${r.estado}).`,
    );
  }

  console.log("Creando favoritos de ejemplo...");

  const favoritosIniciales = [
    { usuarioEmail: "Lau_Gomez88@gmail.com", salaId: "A" },
    { usuarioEmail: "Lau_Gomez88@gmail.com", salaId: "B" },
    { usuarioEmail: "Carlos_Ram22@gmail.com", salaId: "C" },
    { usuarioEmail: "Mari_Lopez07@gmail.com", salaId: "A" },
    { usuarioEmail: "Diego_Torres95@gmail.com", salaId: "B" },
    { usuarioEmail: "Diego_Torres95@gmail.com", salaId: "C" },
  ];

  for (const f of favoritosIniciales) {
    const usuario = usuariosCreados[f.usuarioEmail];

    await prisma.favorito.upsert({
      where: {
        usuarioId_salaId: {
          usuarioId: usuario.id,
          salaId: f.salaId,
        },
      },
      update: {},
      create: {
        usuarioId: usuario.id,
        salaId: f.salaId,
      },
    });
    console.log(`Favorito creado: ${f.usuarioEmail} -> Sala ${f.salaId}.`);
  }

  console.log("Creando mensajes de ejemplo...");
  const mensajesIniciales = [
    {
      nombre: "Ana Pérez",
      email: "ana.perez@example.com",
      asunto: "Disponibilidad Sala A para banda",
      mensaje:
        "Hola, ¿tienen disponibilidad de la Sala A para ensayar los sábados por la tarde?",
      origen: "contacto" as const,
      usuarioEmail: undefined as string | undefined,
      estado: "nuevo" as const,
    },
    {
      nombre: "Roberto Díaz",
      email: "roberto.diaz@example.com",
      asunto: "Cotización para evento corporativo",
      mensaje:
        "Buenas, quisiera una cotización para rentar una sala completa para un evento de una tarde.",
      origen: "contacto" as const,
      usuarioEmail: undefined as string | undefined,
      estado: "respondido" as const,
    },
    {
      nombre: "Laura Gómez",
      email: "Lau_Gomez88@gmail.com",
      asunto: "Problema al pagar mi reserva",
      mensaje:
        "No me deja completar el pago de mi reserva en la Sala A, ¿me pueden ayudar?",
      origen: "soporte" as const,
      usuarioEmail: "Lau_Gomez88@gmail.com",
      estado: "nuevo" as const,
    },
    {
      nombre: "Carlos Ramírez",
      email: "Carlos_Ram22@gmail.com",
      asunto: "Cambio de horario de mi reserva",
      mensaje:
        "Necesito mover mi reserva del 22 de agosto dos horas más tarde, ¿es posible?",
      origen: "soporte" as const,
      usuarioEmail: "Carlos_Ram22@gmail.com",
      estado: "respondido" as const,
    },
  ];

  for (const m of mensajesIniciales) {
    const usuario = m.usuarioEmail
      ? usuariosCreados[m.usuarioEmail]
      : undefined;

    const yaExiste = await prisma.mensaje.findFirst({
      where: { email: m.email, asunto: m.asunto },
    });
    if (yaExiste) {
      console.log(`Mensaje de ${m.email} ("${m.asunto}") ya existe, se omite.`);
      continue;
    }

    await prisma.mensaje.create({
      data: {
        nombre: m.nombre,
        email: m.email,
        asunto: m.asunto,
        mensaje: m.mensaje,
        origen: m.origen,
        usuarioId: usuario?.id,
        estado: m.estado,
      },
    });
    console.log(`Mensaje creado: ${m.email} -> "${m.asunto}" (${m.origen}).`);
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
