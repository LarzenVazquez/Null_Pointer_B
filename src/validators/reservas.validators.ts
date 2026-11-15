import { z } from "zod";
import { MAX_CANTIDAD_SERVICIO, SERVICIOS_IDS } from "../config/servicios.catalogo";

/** "2026-02-30" pasa la regex pero no existe: se comprueba que la fecha sea real. */
function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return true; // el formato ya lo reporta la regex
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

export const idReservaParamSchema = z.object({
  id: z.string().uuid("El id de la reserva no es válido"),
});

// Del cliente solo se acepta QUÉ servicio y CUÁNTOS. Nombre y precios los pone el backend
// (cualquier otro campo que mande la web, como precioUnitario o subtotal, se descarta).
const servicioSeleccionadoSchema = z.object({
  servicioId: z.enum(SERVICIOS_IDS, {
    errorMap: () => ({ message: `Servicio no válido. Opciones: ${SERVICIOS_IDS.join(", ")}` }),
  }),
  cantidad: z
    .number()
    .int("La cantidad debe ser un número entero")
    .min(1, "La cantidad mínima es 1")
    .max(MAX_CANTIDAD_SERVICIO, `La cantidad máxima es ${MAX_CANTIDAD_SERVICIO}`),
});

export const nuevaReservaSchema = z.object({
  salaId: z.string().trim().min(1, "La sala es obligatoria"),
  fecha: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato AAAA-MM-DD")
    .refine(esFechaReal, "La fecha no existe"),
  hora: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm (00:00 a 23:59)"),
  duracionHoras: z
    .number()
    .int("La duración debe ser un número entero de horas")
    .min(1, "La duración mínima es 1 hora")
    .max(12, "La duración máxima es 12 horas"),
  servicios: z
    .array(servicioSeleccionadoSchema)
    .max(SERVICIOS_IDS.length)
    .default([])
    .refine(
      (lista) => new Set(lista.map((s) => s.servicioId)).size === lista.length,
      "No repitas el mismo servicio; usa la cantidad.",
    ),
  notas: z.string().trim().max(1000).optional(),
});

export const actualizarEstadoReservaSchema = z.object({
  estado: z.enum(["pendiente", "confirmada", "completada", "cancelada"], {
    errorMap: () => ({
      message: "El estado debe ser 'pendiente', 'confirmada', 'completada' o 'cancelada'",
    }),
  }),
});

export type NuevaReservaInput = z.infer<typeof nuevaReservaSchema>;
