import crypto from "crypto";

/** Genera un secreto aleatorio seguro (URL-safe) para el reloj. */
export function generarSecreto(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Solo guardamos el hash SHA-256 del secreto; si la BD se filtra, el token no sirve. */
export function hashSecreto(secreto: string): string {
  return crypto.createHash("sha256").update(secreto).digest("hex");
}

/** Código numérico de 6 dígitos que el reloj muestra en pantalla. */
export function generarCodigoVinculacion(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}
