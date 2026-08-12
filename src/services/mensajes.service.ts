import { prisma } from "../lib/prisma";

export type MensajeOrigen = "contacto" | "soporte";
export type MensajeEstado = "nuevo" | "respondido";

export interface Mensaje {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  origen: MensajeOrigen;
  usuarioId?: number;
  estado: MensajeEstado;
  creadoEn: string;
}

export interface NuevoMensajeInput {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  origen: MensajeOrigen;
  usuarioId?: number;
}

function serializar(mensaje: {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  origen: string;
  usuarioId: number | null;
  estado: string;
  creadoEn: Date;
}): Mensaje {
  return {
    id: mensaje.id,
    nombre: mensaje.nombre,
    email: mensaje.email,
    asunto: mensaje.asunto,
    mensaje: mensaje.mensaje,
    origen: mensaje.origen as MensajeOrigen,
    usuarioId: mensaje.usuarioId ?? undefined,
    estado: mensaje.estado as MensajeEstado,
    creadoEn: mensaje.creadoEn.toISOString(),
  };
}

// Los mensajes del formulario de contacto en la página principal y los
// mensajes de soporte se guardan juntos en la misma tabla `mensajes`,
// diferenciados por el campo `origen` ("contacto" | "soporte"). Así
// ambos quedan persistidos en base de datos y ya no se pierden al
// reiniciar el servidor.
export async function crearMensaje(input: NuevoMensajeInput): Promise<Mensaje> {
  const mensaje = await prisma.mensaje.create({
    data: {
      nombre: input.nombre,
      email: input.email,
      asunto: input.asunto,
      mensaje: input.mensaje,
      origen: input.origen,
      usuarioId: input.usuarioId,
    },
  });

  return serializar(mensaje);
}

export async function listarMensajes(
  origen?: MensajeOrigen,
): Promise<Mensaje[]> {
  const mensajes = await prisma.mensaje.findMany({
    where: origen ? { origen } : undefined,
    orderBy: { creadoEn: "desc" },
  });

  return mensajes.map(serializar);
}

export async function marcarComoRespondido(
  id: string,
): Promise<Mensaje | null> {
  const existente = await prisma.mensaje.findUnique({ where: { id } });
  if (!existente) return null;

  const actualizado = await prisma.mensaje.update({
    where: { id },
    data: { estado: "respondido" },
  });

  return serializar(actualizado);
}
