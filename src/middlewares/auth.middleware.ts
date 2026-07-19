import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verificarAccessToken } from "../utils/jwt.utils";

/**
 * requireAuth
 * -----------
 * Protege cualquier ruta (o router completo) exigiendo un access token
 * válido en el header `Authorization: Bearer <token>`.
 *
 * Esto es lo que garantiza la "protección contra acceso directo por URL":
 * sin importar cómo llegue la petición (fetch del SPA, curl, Postman,
 * un link directo, etc.), si no hay un token válido, la petición nunca
 * llega al controller -> se corta aquí con 401.
 */
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

/**
 * optionalAuth
 * ------------
 * Igual que requireAuth pero no bloquea si no hay token: solo adjunta
 * req.usuario si el token es válido. Útil para endpoints públicos que
 * cambian ligeramente su respuesta si el usuario está autenticado.
 */
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
  } catch {
    // Token inválido/expirado en un endpoint opcional: simplemente se ignora.
  }
  next();
}
