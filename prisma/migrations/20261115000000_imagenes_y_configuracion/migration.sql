-- Imágenes de salas en la base de datos (antes en el disco efímero de Render)
CREATE TABLE "imagenes_salas" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "tamano" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_salas_pkey" PRIMARY KEY ("id")
);

-- Ajustes globales persistentes (evento de temporada fijado, etc.)
CREATE TABLE "configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("clave")
);
