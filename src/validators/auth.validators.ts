import { z } from "zod";

// Password segura: min 8, al menos una mayúscula, una minúscula y un número.
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga") // límite práctico de bcrypt
  .regex(/[a-z]/, "Debe incluir al menos una letra minúscula")
  .regex(/[A-Z]/, "Debe incluir al menos una letra mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

export const registroSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre es demasiado largo"),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  telefono: z
    .string()
    .trim()
    .max(20, "El teléfono es demasiado largo")
    .optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const recuperarPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
});

export const actualizarPerfilPropioSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  telefono: z.string().trim().max(20).optional(),
});

export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
