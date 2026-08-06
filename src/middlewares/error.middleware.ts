import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

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

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.noEncontrado(`La ruta ${req.method} ${req.originalUrl} no existe`));
}

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

  return res.status(500).json({
    ok: false,
    mensaje: "Error interno del servidor.",
  });
}
