
DROP INDEX IF EXISTS "usuarios_password_fingerprint_key";
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "password_fingerprint";
CREATE UNIQUE INDEX IF NOT EXISTS "reservas_sala_fecha_hora_activa_key"
  ON "reservas" ("sala_id", "fecha", "hora")
  WHERE "estado" <> 'cancelada';
