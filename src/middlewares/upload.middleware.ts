import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { Request } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

const SALAS_SUBDIR = "salas";

export const SALAS_UPLOAD_DIR = path.join(
  process.cwd(),
  env.UPLOADS_DIR,
  SALAS_SUBDIR,
);

// Nos aseguramos de que el directorio de destino exista antes de recibir archivos.
fs.mkdirSync(SALAS_UPLOAD_DIR, { recursive: true });

const MIME_A_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SALAS_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extension =
      MIME_A_EXTENSION[file.mimetype] ?? path.extname(file.originalname) ?? "";
    const nombreUnico = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
    cb(null, nombreUnico);
  },
});

function filtroDeArchivo(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!MIME_A_EXTENSION[file.mimetype]) {
    return cb(
      ApiError.badRequest(
        "Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.",
      ) as unknown as Error,
    );
  }
  cb(null, true);
}

export const uploadImagenSala = multer({
  storage,
  fileFilter: filtroDeArchivo,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
}).single("imagen");

export function construirUrlImagen(nombreArchivo: string): string {
  return `${env.UPLOADS_URL_PREFIX}/${SALAS_SUBDIR}/${nombreArchivo}`;
}

export function eliminarArchivoDeImagen(imagenUrl: string | null | undefined): void {
  if (!imagenUrl) return;
  if (!imagenUrl.startsWith(env.UPLOADS_URL_PREFIX)) return; // No es un archivo local gestionado por el backend.

  const nombreArchivo = path.basename(imagenUrl);
  const rutaCompleta = path.join(SALAS_UPLOAD_DIR, nombreArchivo);

  fs.unlink(rutaCompleta, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`[uploads] No se pudo eliminar el archivo ${rutaCompleta}:`, err.message);
    }
  });
}
