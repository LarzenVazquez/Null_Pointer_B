import crypto from "crypto";
import { env } from "../config/env";

/**
 * Calcula una huella determinística (HMAC-SHA256) de una contraseña en
 * texto plano. Se usa exclusivamente para poder detectar si dos cuentas
 * están usando la misma contraseña, sin necesidad de guardar la
 * contraseña en texto plano ni de compararla contra cada bcrypt hash
 * existente (lo cual sería impracticable, ya que bcrypt genera un salt
 * distinto en cada hash).
 *
 * Importante: esto NO reemplaza a bcrypt para el login. `passwordHash`
 * sigue siendo la única fuente usada para verificar credenciales; esta
 * huella solo habilita la restricción de unicidad a nivel de base de
 * datos (columna `password_fingerprint`, con índice UNIQUE).
 */
export function calcularFingerprintPassword(password: string): string {
  return crypto
    .createHmac("sha256", env.PASSWORD_FINGERPRINT_SECRET)
    .update(password)
    .digest("hex");
}
