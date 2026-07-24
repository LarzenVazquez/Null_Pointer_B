import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { descifrarPayloadHibrido } from "../utils/hybridCrypto.utils";

export function descifrarLogin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { encryptedKey, iv, ciphertext } = req.body ?? {};

  if (!encryptedKey || !iv || !ciphertext) {
    return next(
      ApiError.badRequest(
        "Payload de login inválido: se esperaba un cuerpo cifrado (encryptedKey, iv, ciphertext)",
      ),
    );
  }

  try {
    req.body = descifrarPayloadHibrido<{ email: string; password: string }>({
      encryptedKey,
      iv,
      ciphertext,
    });
    next();
  } catch (err) {
    next(ApiError.badRequest("No se pudo descifrar el payload de login"));
  }
}
