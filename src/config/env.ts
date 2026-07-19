import "dotenv/config";

/**
 * Config centralizada de variables de entorno.
 * Falla rápido (fail-fast) si falta algo crítico para no arrancar
 * el servidor en un estado inseguro (ej. sin JWT_SECRET).
 */
function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === "") {
    throw new Error(
      `[config] Falta la variable de entorno obligatoria: ${nombre}. Revisa tu archivo .env`
    );
  }
  return valor;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: requerido("DATABASE_URL"),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:4200",

  JWT_SECRET: requerido("JWT_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",

  REFRESH_TOKEN_EXPIRES_DAYS: Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7
  ),
  REFRESH_COOKIE_NAME: "np_refresh_token",

  // Bcrypt: 10-12 es el rango recomendado (costo/rendimiento).
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),

  // Límite de intentos fallidos de login antes de bloquear temporalmente.
  LOGIN_MAX_INTENTOS: Number(process.env.LOGIN_MAX_INTENTOS ?? 5),
  LOGIN_BLOQUEO_MINUTOS: Number(process.env.LOGIN_BLOQUEO_MINUTOS ?? 15),

  get isProduction() {
    return this.NODE_ENV === "production";
  },
};
