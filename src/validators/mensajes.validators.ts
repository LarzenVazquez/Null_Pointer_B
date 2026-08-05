import { z } from "zod";

export const nuevoMensajeSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  asunto: z
    .string()
    .trim()
    .min(2, "El asunto es obligatorio")
    .max(150, "El asunto es demasiado largo"),
  mensaje: z
    .string()
    .trim()
    .min(5, "El mensaje es demasiado corto")
    .max(2000, "El mensaje es demasiado largo"),
  origen: z.enum(["contacto", "soporte"], {
    errorMap: () => ({ message: "El origen debe ser 'contacto' o 'soporte'" }),
  }),
});

export const idMensajeParamSchema = z.object({
  id: z.string().uuid("El id del mensaje no es válido"),
});

export type NuevoMensajeInput = z.infer<typeof nuevoMensajeSchema>;
