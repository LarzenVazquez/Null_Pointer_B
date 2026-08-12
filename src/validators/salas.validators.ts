import { z } from "zod";

export const idSalaParamSchema = z.object({
  id: z.string().trim().min(1, "El id de la sala es obligatorio"),
});

const equipoSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      const texto = val.trim();
      if (texto === "") return [];
      try {
        const parseado = JSON.parse(texto);
        if (Array.isArray(parseado)) return parseado;
      } catch {}
      return texto
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return val;
  },
  z
    .array(z.string().trim().min(1))
    .min(1, "Agrega al menos un elemento de equipo"),
);

const booleanFlexible = z.preprocess((val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val === "true" || val === "1";
  return val;
}, z.boolean());

function numeroFlexible(schema: z.ZodNumber) {
  return z.preprocess((val) => {
    if (typeof val === "string" && val.trim() !== "") return Number(val);
    return val;
  }, schema);
}

const badgeSchema = z.enum(["popular", "pro", "std"], {
  errorMap: () => ({ message: "El badge debe ser 'popular', 'pro' o 'std'" }),
});

export const crearSalaSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "El id solo puede contener letras, números, guiones y guiones bajos",
    )
    .optional(),
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  precio: numeroFlexible(
    z.number().int().min(0, "El precio no puede ser negativo"),
  ),
  capacidad: numeroFlexible(
    z.number().int().min(1, "La capacidad debe ser al menos 1"),
  ),
  m2: numeroFlexible(z.number().int().min(1, "Los m² deben ser al menos 1")),
  badge: badgeSchema,
  badgeLabel: z.string().trim().min(1).max(40),
  featured: booleanFlexible.optional().default(false),
  descripcion: z.string().trim().min(1).max(2000),
  equipo: equipoSchema,
  imagenUrl: z.string().trim().max(500).optional(),
});

export const actualizarSalaSchema = z.object({
  nombre: z.string().trim().min(2).max(80).optional(),
  precio: numeroFlexible(
    z.number().int().min(0, "El precio no puede ser negativo"),
  ).optional(),
  capacidad: numeroFlexible(
    z.number().int().min(1, "La capacidad debe ser al menos 1"),
  ).optional(),
  m2: numeroFlexible(
    z.number().int().min(1, "Los m² deben ser al menos 1"),
  ).optional(),
  badge: badgeSchema.optional(),
  badgeLabel: z.string().trim().min(1).max(40).optional(),
  featured: booleanFlexible.optional(),
  descripcion: z.string().trim().min(1).max(2000).optional(),
  equipo: equipoSchema.optional(),
  imagenUrl: z.string().trim().max(500).optional(),
});

export type CrearSalaInput = z.infer<typeof crearSalaSchema>;
export type ActualizarSalaInput = z.infer<typeof actualizarSalaSchema>;
