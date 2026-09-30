import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { autenticarDispositivo } from "../services/wearable.service";

export const HEADER_TOKEN_DISPOSITIVO = "x-device-token";

/**
 * Autentica peticiones que vienen del reloj.
 * El reloj envía su credencial en el header `X-Device-Token` (obtenida al vincularse).
 * Es independiente del JWT de la web: el reloj no maneja contraseñas ni refresh tokens.
 */
export async function requireWearable(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = String(req.headers[HEADER_TOKEN_DISPOSITIVO] ?? "").trim();
    if (!token) {
      return next(ApiError.noAutorizado("Falta el token del dispositivo (X-Device-Token)"));
    }
    const dispositivo = await autenticarDispositivo(token);
    if (!dispositivo) {
      return next(ApiError.noAutorizado("Dispositivo no vinculado o dado de baja"));
    }
    req.dispositivo = dispositivo;
    next();
  } catch (err) {
    next(err);
  }
}
