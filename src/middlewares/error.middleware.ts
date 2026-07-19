import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

/**
 * Detecta errores conocidos de Prisma (PrismaClientKnownRequestError)
 * sin usar `instanceof Prisma.PrismaClientKnownRequestError`: así el
 * middleware no depende de que el import de `Prisma` resuelva siempre
 * al mismo shape (varía un poco entre versiones/targets de generación
 * del cliente), pero conserva el mismo comportamiento en runtime.
 */
function esErrorPrismaConocido(
  err: unknown
): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as any).constructor?.name === "PrismaClientKnownRequestError" &&
    typeof (err as any).code === "string"
  );
}

/**
 * 404 para rutas que no existen. Va registrado después de todas las rutas.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.noEncontrado(`La ruta ${req.method} ${req.originalUrl} no existe`));
}

/**
 * Manejador central de errores. TODAS las rutas/middlewares/controllers
 * delegan aquí sus errores (via next(err) o el asyncHandler).
 *
 * Reglas de "manejo adecuado de errores de autenticación":
 *  - Nunca se revela si fue el email o el password lo que falló.
 *  - Nunca se exponen mensajes internos de Prisma o stacks al cliente.
 *  - Siempre se responde con una forma JSON consistente:
 *    { ok: false, mensaje, detalles? }
 *  - En desarrollo se loguea el error completo en consola para depurar.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (!env.isProduction) {
    console.error("[error]", err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      mensaje: err.message,
      detalles: err.detalles,
    });
  }

  // Errores conocidos de Prisma (constraint únicos, FK, etc.)
  if (esErrorPrismaConocido(err)) {
    if (err.code === "P2002") {
      return res.status(409).json({
        ok: false,
        mensaje: "El recurso ya existe (violación de unicidad).",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        ok: false,
        mensaje: "Recurso no encontrado.",
      });
    }
    return res.status(400).json({
      ok: false,
      mensaje: "Error al procesar la solicitud en la base de datos.",
    });
  }

  // Fallback: cualquier otro error no controlado -> 500 genérico.
  return res.status(500).json({
    ok: false,
    mensaje: "Error interno del servidor.",
  });
}
