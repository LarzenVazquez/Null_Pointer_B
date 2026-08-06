import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

interface Intento {
  fallos: number;
  bloqueadoHasta?: number;
}

const intentos = new Map<string, Intento>();

function clave(req: Request): string {
  const email = String(req.body?.email ?? "desconocido").toLowerCase();
  return `${req.ip}:${email}`;
}

export function loginRateLimiter(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const k = clave(req);
  const registro = intentos.get(k);

  if (registro?.bloqueadoHasta && registro.bloqueadoHasta > Date.now()) {
    const segundosRestantes = Math.ceil(
      (registro.bloqueadoHasta - Date.now()) / 1000
    );
    return next(
      ApiError.demasiadosIntentos(
        `Demasiados intentos fallidos. Intenta de nuevo en ${segundosRestantes} segundos.`
      )
    );
  }

  next();
}

export function registrarLoginFallido(req: Request): void {
  const k = clave(req);
  const registro = intentos.get(k) ?? { fallos: 0 };
  registro.fallos += 1;

  if (registro.fallos >= env.LOGIN_MAX_INTENTOS) {
    registro.bloqueadoHasta =
      Date.now() + env.LOGIN_BLOQUEO_MINUTOS * 60 * 1000;
    registro.fallos = 0;
  }

  intentos.set(k, registro);
}

export function limpiarIntentosLogin(req: Request): void {
  intentos.delete(clave(req));
}
