import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("El id debe ser un entero positivo"),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  telefono: z.string().trim().max(20).optional(),
  activo: z.boolean().optional(),
});

export const cambiarRolSchema = z.object({
  rol: z.enum(["Administrador", "Editor", "Usuario"], {
    errorMap: () => ({
      message: "El rol debe ser Administrador, Editor o Usuario",
    }),
  }),
});

export const crearUsuarioAdminSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  telefono: z.string().trim().max(20).optional(),
  password: z.string().min(8).max(72),
  rol: z
    .enum(["Administrador", "Editor", "Usuario"])
    .optional()
    .default("Usuario"),
});
