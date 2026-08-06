import { z } from "zod";

export const idSalaParamSchema = z.object({
  id: z.string().trim().min(1, "El id de la sala es obligatorio"),
});

export const actualizarSalaSchema = z.object({
  precio: z.number().int().min(0, "El precio no puede ser negativo").optional(),
  badgeLabel: z.string().trim().min(1).max(40).optional(),
  descripcion: z.string().trim().min(1).max(2000).optional(),
});

export type ActualizarSalaInput = z.infer<typeof actualizarSalaSchema>;
