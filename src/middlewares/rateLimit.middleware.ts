import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

/**
 * Limitador de intentos en memoria (suficiente para el alcance de la
 * práctica; en un entorno productivo real se recomienda Redis para que
 * el contador sea compartido entre instancias del servidor).
 *
 * Objetivo: mitigar ataques de fuerza bruta / credential stuffing sobre
 * /api/auth/login, bloqueando temporalmente tras varios intentos fallidos
 * consecutivos combinando email + IP como clave.
 */
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
