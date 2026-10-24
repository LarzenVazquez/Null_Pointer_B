import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // Fecha y hora actuales en Querétaro, redondeadas a la hora en punto (ej. 15:30 -> 15:00)
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
  const hh = ahora.toLocaleTimeString("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    hour12: false,
  });
  const hora = `${hh.slice(0, 2)}:00`;

  const laura = await prisma.usuario.findUniqueOrThrow({
    where: { email: "lau_gomez88@gmail.com" },
  });
  const sala = await prisma.sala.findUniqueOrThrow({ where: { id: "A" } });

  const existe = await prisma.reserva.findFirst({
    where: { salaId: "A", fecha, hora },
  });
  if (existe) {
    console.log(`Ya existe una reserva en Sala A ${fecha} ${hora}.`);
    return;
  }

  await prisma.reserva.create({
    data: {
      usuarioId: laura.id,
      salaId: "A",
      fecha,
      hora,
      duracionHoras: 2,
      precioSala: sala.precio * 2,
      servicios: [],
      precioServicios: 0,
      precioTotal: sala.precio * 2,
      estado: "confirmada",
      notas: "Reserva en curso para la captura de DEF-01.",
    },
  });
  console.log(
    `Reserva creada: Sala A ${fecha} ${hora} (2 h), confirmada y en curso.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
