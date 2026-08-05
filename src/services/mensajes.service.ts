import crypto from "crypto";

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

// Igual que el evento fijado en eventos.service.ts: esta lista vive SOLO
// en la memoria del proceso de Node. A propósito NO se guarda en la base
// de datos, así que si el servidor se reinicia (o escalas a más de una
// instancia), los mensajes se pierden. Son visibles para todos mientras
// el proceso siga vivo, pero no son persistentes.
const mensajes: Mensaje[] = [];

export function crearMensaje(input: NuevoMensajeInput): Mensaje {
  const mensaje: Mensaje = {
    id: crypto.randomUUID(),
    nombre: input.nombre,
    email: input.email,
    asunto: input.asunto,
    mensaje: input.mensaje,
    origen: input.origen,
    usuarioId: input.usuarioId,
    estado: "nuevo",
    creadoEn: new Date().toISOString(),
  };

  mensajes.unshift(mensaje);
  return mensaje;
}

export function listarMensajes(origen?: MensajeOrigen): Mensaje[] {
  if (!origen) return [...mensajes];
  return mensajes.filter((m) => m.origen === origen);
}

export function marcarComoRespondido(id: string): Mensaje | null {
  const mensaje = mensajes.find((m) => m.id === id);
  if (!mensaje) return null;

  mensaje.estado = "respondido";
  return mensaje;
}
