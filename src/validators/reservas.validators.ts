import { z } from "zod";
import { MAX_CANTIDAD_SERVICIO, SERVICIOS_IDS } from "../config/servicios.catalogo";

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
  fecha: z.string().trim().min(1, "La fecha es obligatoria"),
  hora: z.string().trim().min(1, "La hora es obligatoria"),
  duracionHoras: z.number().int().min(1).max(12),
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
