import { env } from "../config/env";

/**
 * Las reservas guardan `fecha` ("YYYY-MM-DD") y `hora` ("HH:mm") como texto en hora local
 * de Querétaro. Esta función las convierte a un instante real (Date) usando el offset configurado.
 */
export function inicioDeReserva(fecha: string, hora: string): Date {
  const [h = "0", m = "0"] = hora.split(":");
  const hh = h.padStart(2, "0");
  const mm = m.padStart(2, "0");
  return new Date(`${fecha}T${hh}:${mm}:00${env.ZONA_HORARIA_OFFSET}`);
}

/** Fecha local ("YYYY-MM-DD") de un instante, según el offset configurado. */
export function fechaLocal(instante: Date = new Date()): string {
  const [signo, hhmm] = [env.ZONA_HORARIA_OFFSET[0], env.ZONA_HORARIA_OFFSET.slice(1)];
  const [hh, mm] = hhmm.split(":").map(Number);
  const offsetMs = (signo === "-" ? -1 : 1) * ((hh || 0) * 60 + (mm || 0)) * 60_000;
  return new Date(instante.getTime() + offsetMs).toISOString().slice(0, 10);
}

/** "2026-09-27" -> "27 sep" (formato corto para pantallas pequeñas). */
export function fechaCorta(fecha: string): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const [, mes, dia] = fecha.split("-").map(Number);
  if (!mes || !dia) return fecha;
  return `${dia} ${meses[mes - 1]}`;
}
