import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verificarAccessToken } from "../utils/jwt.utils";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(ApiError.noAutorizado("Token de acceso no proporcionado"));
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verificarAccessToken(token);
    req.usuario = {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      roles: payload.roles,
      permisos: payload.permisos,
    };
    return next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return next(ApiError.noAutorizado("El token de acceso expiró"));
    }
    return next(ApiError.noAutorizado("Token de acceso inválido"));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verificarAccessToken(token);
    req.usuario = {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      roles: payload.roles,
      permisos: payload.permisos,
    };
  } catch {}
  next();
}
