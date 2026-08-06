import { z } from "zod";

export const idReservaParamSchema = z.object({
  id: z.string().uuid("El id de la reserva no es válido"),
});

const servicioSeleccionadoSchema = z.object({
  servicioId: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  cantidad: z.number().int().min(1),
  precioUnitario: z.number().min(0),
  subtotal: z.number().min(0),
});

export const nuevaReservaSchema = z.object({
  salaId: z.string().trim().min(1, "La sala es obligatoria"),
  fecha: z.string().trim().min(1, "La fecha es obligatoria"),
  hora: z.string().trim().min(1, "La hora es obligatoria"),
  duracionHoras: z.number().int().min(1).max(12),
  servicios: z.array(servicioSeleccionadoSchema).default([]),
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
