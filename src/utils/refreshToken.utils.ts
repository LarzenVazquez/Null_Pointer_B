import crypto from "crypto";

/**
 * Los refresh tokens NO son JWT: son valores aleatorios opacos de 256 bits.
 * Ventaja sobre un JWT de refresco: se pueden invalidar de inmediato en BD
 * (logout, robo detectado, etc.) sin depender de que expire su firma.
 *
 * Solo se guarda en BD el HASH (sha256) del token. El valor "en claro" se
 * entrega una única vez al cliente (cookie httpOnly). Así, si la base de
 * datos se filtra, no se pueden reutilizar las sesiones activas.
 */

export function generarRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(tokenPlano: string): string {
  return crypto.createHash("sha256").update(tokenPlano).digest("hex");
}
