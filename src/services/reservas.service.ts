import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { CATALOGO_SERVICIOS, ServicioId } from "../config/servicios.catalogo";
import { inicioDeReserva } from "../utils/fechas.utils";
import {
  enSegundoPlano,
  notificarReservaCancelada,
  notificarReservaConfirmada,
} from "./notificaciones.service";

/** Lo único que decide el cliente: qué servicio y cuántas unidades. */
export interface ServicioSolicitadoInput {
  servicioId: ServicioId;
  cantidad: number;
}

/** Lo que se guarda en la reserva, con nombre y precios tomados del catálogo. */
interface ServicioCobrado {
  servicioId: ServicioId;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

function cotizarServicios(solicitados: ServicioSolicitadoInput[]): ServicioCobrado[] {
  return solicitados.map(({ servicioId, cantidad }) => {
    const servicio = CATALOGO_SERVICIOS[servicioId];
    if (!servicio) throw ApiError.badRequest(`El servicio '${servicioId}' no existe.`);
    // Los servicios que no se cobran por cantidad (p. ej. grabación) cuentan una sola vez.
    const unidades = servicio.requiereCantidad ? cantidad : 1;
    return {
      servicioId,
      nombre: servicio.nombre,
      cantidad: unidades,
      precioUnitario: servicio.precio,
      subtotal: servicio.precio * unidades,
    };
  });
}

export interface NuevaReservaInput {
  usuarioId: number;
  salaId: string;
  fecha: string;
  hora: string;
  duracionHoras: number;
  servicios: ServicioSolicitadoInput[];
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

/**
 * @param soloDeUsuarioId si se indica, la reserva debe pertenecer a ese Usuario.
 *        Si es de otra persona se responde 404 (no 403) para no revelar que existe.
 */
export async function getReservaById(id: string, soloDeUsuarioId?: number) {
  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: includeSala,
  });
  if (!reserva || (soloDeUsuarioId !== undefined && reserva.usuarioId !== soloDeUsuarioId))
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

  // Todos los precios se calculan aquí; lo que haya mandado el cliente no cuenta.
  const precioSala = sala.precio * input.duracionHoras;
  const servicios = cotizarServicios(input.servicios);
  const precioServicios = servicios.reduce((sum, s) => sum + s.subtotal, 0);

  try {
    const reserva = await prisma.reserva.create({
      data: {
        usuarioId: input.usuarioId,
        salaId: sala.id,
        fecha: input.fecha,
        hora: input.hora,
        duracionHoras: input.duracionHoras,
        precioSala,
        servicios: servicios as any,
        precioServicios,
        precioTotal: precioSala + precioServicios,
        estado: "confirmada",
        notas: input.notas,
      },
      include: includeSala,
    });

    const serializada = serializar(reserva);
    // Wear: la reserva nace confirmada -> aviso al reloj.
    enSegundoPlano(notificarReservaConfirmada(serializada), "reserva creada");
    return serializada;
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
  const anterior = await getReservaById(id);

  const reserva = await prisma.reserva.update({
    where: { id },
    data: {
      estado,
      // Si vuelve a confirmarse, se permite un nuevo recordatorio.
      ...(estado === "confirmada" && anterior.estado !== "confirmada"
        ? { recordatorioEnviado: false }
        : {}),
    },
    include: includeSala,
  });

  const serializada = serializar(reserva);

  // Wear: solo avisamos si el estado realmente cambió.
  if (anterior.estado !== estado) {
    if (estado === "confirmada") {
      enSegundoPlano(notificarReservaConfirmada(serializada), "reserva confirmada");
    } else if (estado === "cancelada") {
      enSegundoPlano(
        notificarReservaCancelada(serializada, { porElUsuario: false }),
        "reserva cancelada (staff)",
      );
    }
  }

  return serializada;
}

export async function cancelarReserva(id: string, usuarioId?: number) {
  const existente = await prisma.reserva.findUnique({ where: { id } });
  if (!existente)
    throw ApiError.noEncontrado(`No existe una reserva con id '${id}'`);

  if (usuarioId !== undefined && existente.usuarioId !== usuarioId) {
    throw ApiError.prohibido("No puedes cancelar una reserva que no es tuya.");
  }

  if (existente.estado === "completada") {
    throw ApiError.conflicto("Esta reserva ya se completó y no se puede cancelar.");
  }

  // El Usuario no puede cancelar un ensayo que ya empezó; un Administrador sí (p. ej. una falla en la sala).
  if (
    usuarioId !== undefined &&
    existente.estado !== "cancelada" &&
    inicioDeReserva(existente.fecha, existente.hora) <= new Date()
  ) {
    throw ApiError.conflicto("Tu ensayo ya empezó; para cancelarlo contacta al estudio.");
  }

  const yaEstabaCancelada = existente.estado === "cancelada";

  const reserva = await prisma.reserva.update({
    where: { id },
    data: { estado: "cancelada" },
    include: includeSala,
  });

  const serializada = serializar(reserva);
  if (!yaEstabaCancelada) {
    // usuarioId definido = la canceló el propio Usuario; undefined = la canceló un Administrador.
    enSegundoPlano(
      notificarReservaCancelada(serializada, { porElUsuario: usuarioId !== undefined }),
      "reserva cancelada",
    );
  }
  return serializada;
}
