import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import * as authService from "../services/auth.service";
import { getPublicKeyPem } from "../utils/hybridCrypto.utils";
import {
  limpiarIntentosLogin,
  registrarLoginFallido,
} from "../middlewares/rateLimit.middleware";

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(env.REFRESH_COOKIE_NAME, token, cookieOptions);
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
}

// Llave pública RSA vigente para que el frontend cifre el login
// (ver src/utils/hybridCrypto.utils.ts). No requiere autenticación:
// se necesita ANTES de poder iniciar sesión.
export const publicKey = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, publicKey: getPublicKeyPem() });
});

export const registro = asyncHandler(async (req: Request, res: Response) => {
  // El cifrado de la contraseña (bcrypt) se hace UNA sola vez, dentro de
  // authService.registrarUsuario. Aquí solo se reenvía la contraseña en
  // texto plano recibida del formulario: si se hashea también en este
  // controller, el service la volvería a hashear (hash de un hash) y
  // el usuario jamás podría volver a iniciar sesión con su contraseña real.
  const usuario = await authService.registrarUsuario(req.body);

  res.status(201).json({
    ok: true,
    mensaje: "Usuario registrado correctamente. Ahora puedes iniciar sesión.",
    usuario,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { usuario, accessToken, refreshTokenPlano } =
      await authService.iniciarSesion(req.body, {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });

    limpiarIntentosLogin(req);
    setRefreshCookie(res, refreshTokenPlano);

    res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión exitoso",
      usuario,
      accessToken,
    });
  } catch (err) {
    // Solo contamos como "intento fallido" errores de credenciales,
    // no errores de infraestructura (500) que no dependen del atacante.
    if (err instanceof ApiError && err.statusCode === 401) {
      registrarLoginFallido(req);
    }
    throw err;
  }
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const tokenActual = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (!tokenActual) {
    throw ApiError.noAutorizado("No hay sesión activa");
  }

  const { usuario, accessToken, refreshTokenPlano } =
    await authService.refrescarSesion(tokenActual, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

  setRefreshCookie(res, refreshTokenPlano);

  res.status(200).json({ ok: true, usuario, accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const tokenActual = req.cookies?.[env.REFRESH_COOKIE_NAME];
  await authService.cerrarSesion(tokenActual);
  clearRefreshCookie(res);
  res.status(200).json({ ok: true, mensaje: "Sesión cerrada correctamente" });
});

export const logoutTodos = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) throw ApiError.noAutorizado();
  await authService.cerrarTodasLasSesiones(req.usuario.id);
  clearRefreshCookie(res);
  res
    .status(200)
    .json({ ok: true, mensaje: "Se cerraron todas las sesiones activas" });
});

export const perfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.usuario) throw ApiError.noAutorizado();
  const usuario = await authService.obtenerPerfil(req.usuario.id);
  res.status(200).json({ ok: true, usuario });
});

export const actualizarPerfil = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.usuario) throw ApiError.noAutorizado();
    const usuario = await authService.actualizarPerfilPropio(
      req.usuario.id,
      req.body,
    );
    res.status(200).json({ ok: true, mensaje: "Perfil actualizado", usuario });
  },
);
