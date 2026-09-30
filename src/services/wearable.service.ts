import { TipoNotificacion } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import {
  generarCodigoVinculacion,
  generarSecreto,
  hashSecreto,
} from "../utils/deviceToken.utils";
import { fechaLocal, inicioDeReserva } from "../utils/fechas.utils";
import { crearYEnviar } from "./notificaciones.service";

/**
 * Registro de dispositivo wearable (DispWearable).
 *
 * Vinculación estilo "device code" (sin teclear contraseñas en el reloj):
 *  1. El reloj pide un código  -> POST /api/wearable/vinculacion/solicitar
 *  2. El Usuario lo escribe en la web (Mi reloj) -> POST /api/wearable/vinculacion/confirmar
 *  3. El reloj consulta cada pocos segundos -> POST /api/wearable/vinculacion/estado
 *     y cuando está confirmado recibe su token de dispositivo (X-Device-Token).
 */

const INTERVALO_CONSULTA_SEGUNDOS = 5;
const MAX_FALLOS_CONFIRMAR = 10;
const VENTANA_FALLOS_MS = 15 * 60 * 1000;

const fallosConfirmar = new Map<number, { fallos: number; desde: number }>();

function serializarDispositivo(d: {
  id: number;
  nombre: string;
  modelo: string | null;
  plataforma: string;
  fcmToken: string | null;
  activo: boolean;
  ultimoAcceso: Date | null;
  createdAt: Date;
}) {
  return {
    id: d.id,
    nombre: d.nombre,
    modelo: d.modelo,
    plataforma: d.plataforma,
    pushHabilitado: Boolean(d.fcmToken),
    activo: d.activo,
    ultimoAcceso: d.ultimoAcceso?.toISOString() ?? null,
    vinculadoEn: d.createdAt.toISOString(),
  };
}

// ─────────────────────────── Vinculación ───────────────────────────

export async function solicitarVinculacion(input: { nombre: string; modelo?: string }) {
  const ahora = new Date();

  // Limpieza de códigos viejos para que la tabla no crezca sin control.
  await prisma.vinculacionWearable.deleteMany({
    where: {
      OR: [
        { expiraEn: { lt: new Date(ahora.getTime() - 24 * 60 * 60 * 1000) } },
        { consumida: true, createdAt: { lt: new Date(ahora.getTime() - 60 * 60 * 1000) } },
      ],
    },
  });

  // Código único entre los que siguen vigentes.
  let codigo = generarCodigoVinculacion();
  for (let i = 0; i < 10; i++) {
    const enUso = await prisma.vinculacionWearable.findFirst({
      where: { codigo, consumida: false, expiraEn: { gt: ahora } },
      select: { id: true },
    });
    if (!enUso) break;
    codigo = generarCodigoVinculacion();
  }

  const deviceCode = generarSecreto();
  const expiraEn = new Date(ahora.getTime() + env.VINCULACION_EXPIRA_MINUTOS * 60 * 1000);

  await prisma.vinculacionWearable.create({
    data: {
      codigo,
      deviceCodeHash: hashSecreto(deviceCode),
      nombre: input.nombre,
      modelo: input.modelo,
      expiraEn,
    },
  });

  return {
    codigo,
    deviceCode,
    expiraEn: expiraEn.toISOString(),
    intervaloSegundos: INTERVALO_CONSULTA_SEGUNDOS,
  };
}

function registrarFalloConfirmar(usuarioId: number) {
  const ahora = Date.now();
  const r = fallosConfirmar.get(usuarioId);
  if (!r || ahora - r.desde > VENTANA_FALLOS_MS) {
    fallosConfirmar.set(usuarioId, { fallos: 1, desde: ahora });
  } else {
    r.fallos += 1;
  }
}

export async function confirmarVinculacion(usuarioId: number, codigoCrudo: string) {
  const registro = fallosConfirmar.get(usuarioId);
  if (
    registro &&
    Date.now() - registro.desde <= VENTANA_FALLOS_MS &&
    registro.fallos >= MAX_FALLOS_CONFIRMAR
  ) {
    throw ApiError.demasiadosIntentos(
      "Demasiados códigos incorrectos. Espera unos minutos e inténtalo de nuevo.",
    );
  }

  const codigo = codigoCrudo.replace(/\D/g, "");
  const vinculacion = await prisma.vinculacionWearable.findFirst({
    where: {
      codigo,
      consumida: false,
      usuarioId: null,
      expiraEn: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!vinculacion) {
    registrarFalloConfirmar(usuarioId);
    throw ApiError.badRequest(
      "El código no es válido o ya expiró. Revisa el que aparece en tu reloj.",
    );
  }

  await prisma.vinculacionWearable.update({
    where: { id: vinculacion.id },
    data: { usuarioId, confirmadaEn: new Date() },
  });
  fallosConfirmar.delete(usuarioId);

  return { nombre: vinculacion.nombre, modelo: vinculacion.modelo };
}

export async function consultarVinculacion(deviceCode: string) {
  const vinculacion = await prisma.vinculacionWearable.findUnique({
    where: { deviceCodeHash: hashSecreto(deviceCode) },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  if (!vinculacion) throw ApiError.noEncontrado("Solicitud de vinculación no encontrada");
  if (vinculacion.consumida) {
    throw ApiError.conflicto("Este código ya se utilizó. Solicita uno nuevo.");
  }

  if (!vinculacion.usuarioId || !vinculacion.usuario) {
    if (vinculacion.expiraEn <= new Date()) {
      return { estado: "expirado" as const };
    }
    return { estado: "pendiente" as const };
  }

  // Reclamo atómico: si el reloj consulta dos veces a la vez, solo una crea el dispositivo.
  const reclamo = await prisma.vinculacionWearable.updateMany({
    where: { id: vinculacion.id, consumida: false },
    data: { consumida: true },
  });
  if (reclamo.count === 0) {
    throw ApiError.conflicto("Este código ya se utilizó. Solicita uno nuevo.");
  }

  const tokenDispositivo = generarSecreto(48);
  const dispositivo = await prisma.dispWearable.create({
    data: {
      usuarioId: vinculacion.usuarioId,
      nombre: vinculacion.nombre,
      modelo: vinculacion.modelo,
      tokenHash: hashSecreto(tokenDispositivo),
      ultimoAcceso: new Date(),
    },
  });

  return {
    estado: "vinculado" as const,
    tokenDispositivo,
    dispositivo: serializarDispositivo(dispositivo),
    usuario: { id: vinculacion.usuario.id, nombre: vinculacion.usuario.nombre },
  };
}

// ─────────────────────────── Autenticación del reloj ───────────────────────────

export async function autenticarDispositivo(token: string) {
  const dispositivo = await prisma.dispWearable.findUnique({
    where: { tokenHash: hashSecreto(token) },
    select: { id: true, usuarioId: true, activo: true, ultimoAcceso: true },
  });
  if (!dispositivo || !dispositivo.activo) return null;

  // Actualiza "último acceso" como máximo una vez por minuto.
  const hace1Min = Date.now() - 60_000;
  if (!dispositivo.ultimoAcceso || dispositivo.ultimoAcceso.getTime() < hace1Min) {
    await prisma.dispWearable.update({
      where: { id: dispositivo.id },
      data: { ultimoAcceso: new Date() },
    });
  }

  return { id: dispositivo.id, usuarioId: dispositivo.usuarioId };
}

// ─────────────────────────── Token FCM (registro / baja) ───────────────────────────

export async function registrarFcmToken(dispositivoId: number, fcmToken: string) {
  // Un token FCM pertenece a una sola instalación: si otro registro lo tenía, se libera.
  await prisma.dispWearable.updateMany({
    where: { fcmToken, id: { not: dispositivoId } },
    data: { fcmToken: null },
  });
  const d = await prisma.dispWearable.update({
    where: { id: dispositivoId },
    data: { fcmToken },
  });
  return serializarDispositivo(d);
}

export async function darDeBajaFcmToken(dispositivoId: number) {
  const d = await prisma.dispWearable.update({
    where: { id: dispositivoId },
    data: { fcmToken: null },
  });
  return serializarDispositivo(d);
}

// ─────────────────────────── Dispositivos ───────────────────────────

export async function obtenerDispositivo(dispositivoId: number) {
  const d = await prisma.dispWearable.findUnique({
    where: { id: dispositivoId },
    include: { usuario: { select: { id: true, nombre: true } } },
  });
  if (!d) throw ApiError.noEncontrado("Dispositivo no encontrado");
  return { dispositivo: serializarDispositivo(d), usuario: d.usuario };
}

export async function listarDispositivosDeUsuario(usuarioId: number) {
  const lista = await prisma.dispWearable.findMany({
    where: { usuarioId },
    orderBy: { createdAt: "desc" },
  });
  return lista.map(serializarDispositivo);
}

/** Da de baja (desvincula) el reloj: se elimina su registro y deja de recibir avisos. */
export async function eliminarDispositivo(dispositivoId: number, usuarioId: number) {
  const d = await prisma.dispWearable.findUnique({ where: { id: dispositivoId } });
  if (!d || d.usuarioId !== usuarioId) {
    throw ApiError.noEncontrado("Dispositivo no encontrado");
  }
  await prisma.dispWearable.delete({ where: { id: dispositivoId } });
  return { id: dispositivoId };
}

// ─────────────────────────── Datos para las pantallas del reloj ───────────────────────────

export async function proximasReservas(usuarioId: number, limite = 10) {
  const ahora = new Date();
  const reservas = await prisma.reserva.findMany({
    where: {
      usuarioId,
      estado: { in: ["pendiente", "confirmada"] },
      fecha: { gte: fechaLocal(ahora) },
    },
    include: { sala: { select: { nombre: true } } },
    orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    take: 50,
  });

  return reservas
    .map((r) => {
      const inicio = inicioDeReserva(r.fecha, r.hora);
      const fin = new Date(inicio.getTime() + r.duracionHoras * 60 * 60 * 1000);
      return {
        id: r.id,
        salaId: r.salaId,
        salaNombre: r.sala?.nombre ?? r.salaId,
        fecha: r.fecha,
        hora: r.hora,
        duracionHoras: r.duracionHoras,
        estado: r.estado,
        precioTotal: r.precioTotal,
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
      };
    })
    .filter((r) => new Date(r.fin) > ahora)
    .slice(0, limite);
}

export async function resumen(usuarioId: number) {
  const [usuario, reservas, noLeidas, favoritos] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, nombre: true } }),
    proximasReservas(usuarioId, 1),
    prisma.notificacion.count({ where: { usuarioId, leida: false } }),
    prisma.favorito.count({ where: { usuarioId } }),
  ]);
  return {
    usuario,
    proximaReserva: reservas[0] ?? null,
    noLeidas,
    favoritos,
    servidorAhora: new Date().toISOString(),
  };
}

// ─────────────────────────── Aviso de prueba ───────────────────────────

/** Envía un aviso de ejemplo del tipo indicado (útil para probar el diseño de cada tarjeta). */
export async function enviarPrueba(usuarioId: number, tipo: TipoNotificacion) {
  const [reserva, favorito] = await Promise.all([
    prisma.reserva.findFirst({
      where: { usuarioId },
      include: { sala: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.favorito.findFirst({
      where: { usuarioId },
      include: { sala: { select: { id: true, nombre: true, precio: true } } },
    }),
  ]);

  const sala = reserva?.sala?.nombre ?? "Sala Principal";
  const fecha = reserva?.fecha ?? fechaLocal();
  const hora = reserva?.hora ?? "18:00";
  const base = { reservaId: reserva?.id, salaId: reserva?.salaId, salaNombre: sala, fecha, hora, prueba: true };

  const plantillas: Record<TipoNotificacion, { titulo: string; cuerpo: string; datos: object }> = {
    reserva_confirmada: {
      titulo: "Reserva confirmada",
      cuerpo: `${sala} · ${fecha} · ${hora} (prueba)`,
      datos: base,
    },
    reserva_cancelada: {
      titulo: "Reserva cancelada",
      cuerpo: `${sala} · ${fecha} · ${hora} (prueba)`,
      datos: base,
    },
    recordatorio_reserva: {
      titulo: "Tu ensayo empieza pronto",
      cuerpo: `${sala} a las ${hora} (en 60 min) (prueba)`,
      datos: { ...base, minutosRestantes: 60 },
    },
    cambio_sala_favorita: {
      titulo: "Cambio en tu sala favorita",
      cuerpo: favorito
        ? `${favorito.sala.nombre}: Precio $${favorito.sala.precio} → $${favorito.sala.precio + 50}/h (prueba)`
        : "Sala Principal: Precio $300 → $350/h (prueba)",
      datos: { salaId: favorito?.sala.id, salaNombre: favorito?.sala.nombre ?? "Sala Principal", prueba: true },
    },
  };

  const p = plantillas[tipo];
  return crearYEnviar({
    usuarioId,
    tipo,
    titulo: p.titulo,
    cuerpo: p.cuerpo,
    datos: p.datos as Record<string, unknown>,
  });
}
