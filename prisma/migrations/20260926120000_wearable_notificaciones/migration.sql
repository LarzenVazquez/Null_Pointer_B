-- Null Pointer Wear: dispositivos wearable, vinculación y notificaciones

-- CreateEnum
CREATE TYPE "tipo_notificacion" AS ENUM ('reserva_confirmada', 'reserva_cancelada', 'recordatorio_reserva', 'cambio_sala_favorita');

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN "recordatorio_enviado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "disp_wearables" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "modelo" TEXT,
    "plataforma" TEXT NOT NULL DEFAULT 'wear_os',
    "token_hash" TEXT NOT NULL,
    "fcm_token" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disp_wearables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculaciones_wearable" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "device_code_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modelo" TEXT,
    "usuario_id" INTEGER,
    "confirmada_en" TIMESTAMP(3),
    "consumida" BOOLEAN NOT NULL DEFAULT false,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vinculaciones_wearable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" "tipo_notificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "datos" JSONB,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enviada_push" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disp_wearables_token_hash_key" ON "disp_wearables"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "disp_wearables_fcm_token_key" ON "disp_wearables"("fcm_token");

-- CreateIndex
CREATE INDEX "disp_wearables_usuario_id_idx" ON "disp_wearables"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculaciones_wearable_device_code_hash_key" ON "vinculaciones_wearable"("device_code_hash");

-- CreateIndex
CREATE INDEX "vinculaciones_wearable_codigo_idx" ON "vinculaciones_wearable"("codigo");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_creado_en_idx" ON "notificaciones"("usuario_id", "creado_en");

-- AddForeignKey
ALTER TABLE "disp_wearables" ADD CONSTRAINT "disp_wearables_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculaciones_wearable" ADD CONSTRAINT "vinculaciones_wearable_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
