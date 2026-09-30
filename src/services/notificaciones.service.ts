import { Prisma, TipoNotificacion } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { obtenerMessaging } from "../lib/firebase";
import { ApiError } from "../utils/ApiError";
import { fechaCorta } from "../utils/fechas.utils";

/**
 * Servicio central de avisos de Null Pointer Wear.
 *
 * Flujo: (reserva / sala cambia) -> crearYEnviar() -> fila en `notificaciones`
 *        -> push por FCM a los relojes activos del Usuario (si Firebase está configurado).
 *
 * Aunque no haya Firebase, la notificación queda guardada y el reloj la obtiene
 * con GET /api/wearable/notificaciones (sincronización periódica).
 */

export const TIPOS_NOTIFICACION = [
  "reserva_confirmada",
  "reserva_cancelada",
  "recordatorio_reserva",
  "cambio_sala_favorita",
] as const;

export interface NuevaNotificacion {
  usuarioId: number;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  datos?: Record<string, unknown>;
}

/** Datos mínimos de una reserva que necesitan los avisos (coincide con reservas.service#serializar). */
export interface ReservaParaAviso {
  id: string;
  usuarioId: string | number;
  salaId: string;
  salaNombre: string;
  fecha: string;
  hora: string;
  duracionHoras: number;
  estado?: string;
}

const CODIGOS_TOKEN_INVALIDO = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export function serializarNotificacion(n: {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  datos: Prisma.JsonValue | null;
  leida: boolean;
  creadoEn: Date;
}) {
  return {
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    datos: (n.datos as Record<string, unknown> | null) ?? {},
    leida: n.leida,
    creadoEn: n.creadoEn.toISOString(),
  };
}

// ─────────────────────────── Núcleo ───────────────────────────

export async function crearYEnviar(input: NuevaNotificacion) {
  const notificacion = await prisma.notificacion.create({
    data: {
      usuarioId: input.usuarioId,
      tipo: input.tipo,
      titulo: input.titulo,
      cuerpo: input.cuerpo,
      datos: (input.datos ?? {}) as Prisma.InputJsonValue,
    },
  });

  const serializada = serializarNotificacion(notificacion);
  let enviados = 0;
  try {
    enviados = await enviarPush(input.usuarioId, serializada);
  } catch (err) {
    // Si FCM falla, el aviso queda guardado y el reloj lo recoge en su próxima sincronización.
    console.error("[fcm] Error al enviar push:", err);
  }

  if (enviados > 0) {
    await prisma.notificacion.update({
      where: { id: notificacion.id },
      data: { enviadaPush: true },
    });
  }

  return serializada;
}

/**
 * Envía un mensaje *data-only* por FCM. Se usa data-only (sin bloque `notification`)
 * para que la app del reloj construya la tarjeta con su propio diseño, icono y vibración.
 * Devuelve cuántos relojes recibieron el push.
 */
async function enviarPush(
  usuarioId: number,
  n: ReturnType<typeof serializarNotificacion>,
): Promise<number> {
  const messaging = obtenerMessaging();
  if (!messaging) return 0;

  const dispositivos = await prisma.dispWearable.findMany({
    where: { usuarioId, activo: true, fcmToken: { not: null } },
    select: { id: true, fcmToken: true },
  });
  if (dispositivos.length === 0) return 0;

  const tokens = dispositivos.map((d) => d.fcmToken!) as string[];

  const respuesta = await messaging.sendEachForMulticast({
    tokens,
    data: {
      notificacionId: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      cuerpo: n.cuerpo,
      creadoEn: n.creadoEn,
      datos: JSON.stringify(n.datos ?? {}),
    },
    android: {
      priority: "high",
      ttl: 6 * 60 * 60 * 1000, // 6 h: después ya no tiene sentido mostrarlo
    },
  });

  // Limpia tokens que FCM reporta como inválidos (app desinstalada, token rotado, etc.)
  const invalidos: number[] = [];
  respuesta.responses.forEach((r, i) => {
    if (!r.success && r.error && CODIGOS_TOKEN_INVALIDO.has(r.error.code)) {
      invalidos.push(dispositivos[i].id);
    }
  });
  if (invalidos.length) {
    await prisma.dispWearable.updateMany({
      where: { id: { in: invalidos } },
      data: { fcmToken: null },
    });
    console.warn(`[fcm] ${invalidos.length} token(s) inválido(s) eliminados.`);
  }

  return respuesta.successCount;
}

/**
 * Ejecuta un aviso sin bloquear ni romper la petición principal.
 * Si falla el aviso, la reserva/sala ya se guardó y solo se registra el error.
 */
export function enSegundoPlano(tarea: Promise<unknown>, etiqueta: string): void {
  tarea.catch((err) => console.error(`[notificaciones] Error en ${etiqueta}:`, err));
}

// ─────────────────────────── Consultas ───────────────────────────

export async function listarDeUsuario(
  usuarioId: number,
  opciones: { limite?: number; soloNoLeidas?: boolean; desde?: Date } = {},
) {
  const notificaciones = await prisma.notificacion.findMany({
    where: {
      usuarioId,
      ...(opciones.soloNoLeidas ? { leida: false } : {}),
      ...(opciones.desde ? { creadoEn: { gt: opciones.desde } } : {}),
    },
    orderBy: { creadoEn: "desc" },
    take: Math.min(opciones.limite ?? 30, 100),
  });
  const noLeidas = await prisma.notificacion.count({
    where: { usuarioId, leida: false },
  });
  return { notificaciones: notificaciones.map(serializarNotificacion), noLeidas };
}

export async function marcarLeida(id: string, usuarioId: number) {
  const n = await prisma.notificacion.findUnique({ where: { id } });
  if (!n || n.usuarioId !== usuarioId) {
    throw ApiError.noEncontrado("La notificación no existe");
  }
  const actualizada = await prisma.notificacion.update({
    where: { id },
    data: { leida: true },
  });
  return serializarNotificacion(actualizada);
}

export async function marcarTodasLeidas(usuarioId: number) {
  const r = await prisma.notificacion.updateMany({
    where: { usuarioId, leida: false },
    data: { leida: true },
  });
  return r.count;
}

// ─────────────────────────── Avisos de dominio ───────────────────────────

function datosDeReserva(r: ReservaParaAviso) {
  return {
    reservaId: r.id,
    salaId: r.salaId,
    salaNombre: r.salaNombre,
    fecha: r.fecha,
    hora: r.hora,
    duracionHoras: r.duracionHoras,
  };
}

function resumenReserva(r: ReservaParaAviso) {
  return `${r.salaNombre} · ${fechaCorta(r.fecha)} · ${r.hora} (${r.duracionHoras} h)`;
}

export function notificarReservaConfirmada(r: ReservaParaAviso) {
  return crearYEnviar({
    usuarioId: Number(r.usuarioId),
    tipo: "reserva_confirmada",
    titulo: "Reserva confirmada",
    cuerpo: resumenReserva(r),
    datos: datosDeReserva(r),
  });
}

export function notificarReservaCancelada(
  r: ReservaParaAviso,
  opciones: { porElUsuario: boolean },
) {
  return crearYEnviar({
    usuarioId: Number(r.usuarioId),
    tipo: "reserva_cancelada",
    titulo: opciones.porElUsuario ? "Cancelaste tu reserva" : "Reserva cancelada",
    cuerpo: opciones.porElUsuario
      ? resumenReserva(r)
      : `${resumenReserva(r)}. Contáctanos si tienes dudas.`,
    datos: { ...datosDeReserva(r), canceladaPor: opciones.porElUsuario ? "usuario" : "staff" },
  });
}

export function notificarRecordatorio(r: ReservaParaAviso, minutosRestantes: number) {
  const cuando =
    minutosRestantes >= 60
      ? `en ${Math.round(minutosRestantes / 60)} h`
      : `en ${Math.max(1, minutosRestantes)} min`;
  return crearYEnviar({
    usuarioId: Number(r.usuarioId),
    tipo: "recordatorio_reserva",
    titulo: "Tu ensayo empieza pronto",
    cuerpo: `${r.salaNombre} a las ${r.hora} (${cuando})`,
    datos: { ...datosDeReserva(r), minutosRestantes },
  });
}

/**
 * Avisa a todos los Usuarios que tienen la sala en favoritos.
 * `cambios` son frases cortas ya formateadas, p. ej. "Precio: $300 → $350/h".
 */
export async function notificarCambioSalaFavorita(params: {
  salaId: string;
  salaNombre: string;
  cambios: string[];
  usuarioIds?: number[]; // si la sala se eliminó, los favoritos ya no existen: se pasan explícitos
}) {
  if (params.cambios.length === 0) return 0;

  const usuarioIds =
    params.usuarioIds ??
    (
      await prisma.favorito.findMany({
        where: { salaId: params.salaId },
        select: { usuarioId: true },
      })
    ).map((f) => f.usuarioId);

  for (const usuarioId of usuarioIds) {
    await crearYEnviar({
      usuarioId,
      tipo: "cambio_sala_favorita",
      titulo: "Cambio en tu sala favorita",
      cuerpo: `${params.salaNombre}: ${params.cambios.join(" · ")}`,
      datos: { salaId: params.salaId, salaNombre: params.salaNombre, cambios: params.cambios },
    });
  }
  return usuarioIds.length;
}
