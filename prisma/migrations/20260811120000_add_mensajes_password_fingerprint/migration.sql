-- CreateEnum
CREATE TYPE "origen_mensaje" AS ENUM ('contacto', 'soporte');

-- CreateEnum
CREATE TYPE "estado_mensaje" AS ENUM ('nuevo', 'respondido');

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "origen" "origen_mensaje" NOT NULL,
    "usuario_id" INTEGER,
    "estado" "estado_mensaje" NOT NULL DEFAULT 'nuevo',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
-- Huella (HMAC) de la contraseña en texto plano, solo para poder detectar
-- contraseñas repetidas entre cuentas sin guardar la contraseña real.
-- Se deja nullable porque las cuentas ya existentes no la tienen todavía;
-- el backend la calcula y la guarda automáticamente en el próximo login
-- de cada usuario, y el seed la asigna a los usuarios de prueba.
ALTER TABLE "usuarios" ADD COLUMN "password_fingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_password_fingerprint_key" ON "usuarios"("password_fingerprint");
