import "dotenv/config";

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === "") {
    throw new Error(
      `[config] Falta la variable de entorno obligatoria: ${nombre}. Revisa tu archivo .env`,
    );
  }
  return valor;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: requerido("DATABASE_URL"),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:4200",
  BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:3000",

  UPLOADS_DIR: process.env.UPLOADS_DIR ?? "uploads",
  UPLOADS_URL_PREFIX: "/uploads",
  MAX_IMAGE_SIZE_MB: Number(process.env.MAX_IMAGE_SIZE_MB ?? 5),

  JWT_SECRET: requerido("JWT_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",

  REFRESH_TOKEN_EXPIRES_DAYS: Number(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7,
  ),
  REFRESH_COOKIE_NAME: "np_refresh_token",

  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),

  // Secreto para calcular la huella de contraseñas (ver
  // src/utils/passwordFingerprint.utils.ts). Si no se define una variable
  // propia, se reutiliza JWT_SECRET para no exigir configuración extra.
  PASSWORD_FINGERPRINT_SECRET:
    process.env.PASSWORD_FINGERPRINT_SECRET ?? requerido("JWT_SECRET"),

  LOGIN_MAX_INTENTOS: Number(process.env.LOGIN_MAX_INTENTOS ?? 5),
  LOGIN_BLOQUEO_MINUTOS: Number(process.env.LOGIN_BLOQUEO_MINUTOS ?? 15),

  ELASTICSEARCH_URL: requerido("ELASTICSEARCH_URL"),

  get isProduction() {
    return this.NODE_ENV === "production";
  },
};
