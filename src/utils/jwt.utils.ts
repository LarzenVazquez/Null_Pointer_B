import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: number; // id del usuario
  email: string;
  nombre: string;
  roles: string[];
  permisos: string[];
}

/**
 * Firma un access token de corta duración. NO se persiste en BD:
 * su validez se verifica únicamente por firma + expiración (stateless).
 */
export function firmarAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifica y decodifica un access token.
 * Lanza si el token es inválido, está mal firmado o expiró.
 */
export function verificarAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as unknown as AccessTokenPayload;
}
