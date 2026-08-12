import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export interface ServicioSeleccionadoInput {
  servicioId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface NuevaReservaInput {
  usuarioId: number;
  salaId: string;
  fecha: string;
  hora: string;
  duracionHoras: number;
  servicios: ServicioSeleccionadoInput[];
  notas?: string;
}

function serializar(reserva: any) {
  return {
    id: reserva.id,
    usuarioId: String(reserva.usuarioId),
    salaId: reserva.salaId,
    salaNombre: reserva.sala?.nombre ?? reserva.salaId,
    fecha: reserva.fecha,
    hora: reserva.hora,
    duracionHoras: reserva.duracionHoras,
    precioSala: reserva.precioSala,
    servicios: reserva.servicios,
    precioServicios: reserva.precioServicios,
    precioTotal: reserva.precioTotal,
    estado: reserva.estado,
    notas: reserva.notas ?? undefined,
    creadoEn: reserva.creadoEn.toISOString(),
  };
}

const includeSala = { sala: true } as const;

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
async function asegurarSinSolapamiento(params: {
  salaId: string;
  fecha: string;
  hora: string;
  duracionHoras: number;
  excluirReservaId?: string;
}) {
  const inicioNueva = horaAMinutos(params.hora);
  const finNueva = inicioNueva + params.duracionHoras * 60;

  const reservasDelDia = await prisma.reserva.findMany({
    where: {
      salaId: params.salaId,
      fecha: params.fecha,
      estado: { not: "cancelada" },
      ...(params.excluirReservaId
        ? { id: { not: params.excluirReservaId } }
        : {}),
    },
    select: { hora: true, duracionHoras: true },
  });

  const hayTraslape = reservasDelDia.some((r) => {
    const inicioExistente = horaAMinutos(r.hora);
    const finExistente = inicioExistente + r.duracionHoras * 60;
    return inicioNueva < finExistente && finNueva > inicioExistente;
  });

  if (hayTraslape) {
    throw ApiError.conflicto(
      "Esa sala ya está reservada en ese horario. Elige otra hora o sala.",
    );
  }
}

export async function getReservasDeUsuario(usuarioId: number) {
  const reservas = await prisma.reserva.findMany({
    where: { usuarioId },
    include: includeSala,
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
  });
  return reservas.map(serializar);
}

export async function getAllReservas() {
  const reservas = await prisma.reserva.findMany({
    include: includeSala,
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
  });
  return reservas.map(serializar);
}

export async function getReservaById(id: string) {
  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: includeSala,
  });
  if (!reserva)
    throw ApiError.noEncontrado(`No existe una reserva con id '${id}'`);
  return serializar(reserva);
}

export async function crearReserva(input: NuevaReservaInput) {
  const sala = await prisma.sala.findUnique({ where: { id: input.salaId } });
  if (!sala) {
    throw ApiError.badRequest("La sala seleccionada ya no está disponible.");
  }

  await asegurarSinSolapamiento({
    salaId: sala.id,
    fecha: input.fecha,
    hora: input.hora,
    duracionHoras: input.duracionHoras,
  });

  const precioSala = sala.precio * input.duracionHoras;
  const precioServicios = input.servicios.reduce(
    (sum, s) => sum + s.subtotal,
    0,
  );

  try {
    const reserva = await prisma.reserva.create({
      data: {
        usuarioId: input.usuarioId,
        salaId: sala.id,
        fecha: input.fecha,
        hora: input.hora,
        duracionHoras: input.duracionHoras,
        precioSala,
        servicios: input.servicios as any,
        precioServicios,
        precioTotal: precioSala + precioServicios,
        estado: "confirmada",
        notas: input.notas,
      },
      include: includeSala,
    });

    return serializar(reserva);
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw ApiError.conflicto(
        "Esa sala ya está reservada en ese horario. Elige otra hora o sala.",
      );
    }
    throw err;
  }
}

export async function actualizarEstado(
  id: string,
  estado: "pendiente" | "confirmada" | "completada" | "cancelada",
) {
  await getReservaById(id);

  const reserva = await prisma.reserva.update({
    where: { id },
    data: { estado },
    include: includeSala,
  });

  return serializar(reserva);
}

export async function cancelarReserva(id: string, usuarioId?: number) {
  const existente = await prisma.reserva.findUnique({ where: { id } });
  if (!existente)
    throw ApiError.noEncontrado(`No existe una reserva con id '${id}'`);

  if (usuarioId !== undefined && existente.usuarioId !== usuarioId) {
    throw ApiError.prohibido("No puedes cancelar una reserva que no es tuya.");
  }

  const reserva = await prisma.reserva.update({
    where: { id },
    data: { estado: "cancelada" },
    include: includeSala,
  });

  return serializar(reserva);
}
