import crypto from "crypto";
import multer from "multer";
import { Request } from "express";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

/**
 * Imágenes de salas.
 *
 * Se guardan en PostgreSQL (tabla imagenes_salas) y NO en disco: el disco de Render
 * se borra en cada deploy o reinicio. La URL pública no cambia: /uploads/salas/<archivo>.
 */

const SALAS_SUBDIR = "salas";
const PREFIJO_SALAS = `${env.UPLOADS_URL_PREFIX}/${SALAS_SUBDIR}/`;

const MIME_A_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

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

/** Recibe el archivo en memoria (campo "imagen"); se guarda en la BD con guardarImagenSala(). */
export const uploadImagenSala = multer({
  storage: multer.memoryStorage(),
  fileFilter: filtroDeArchivo,
  limits: { fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
}).single("imagen");

/** Guarda la imagen subida y devuelve su URL relativa (/uploads/salas/<archivo>). */
export async function guardarImagenSala(file: Express.Multer.File): Promise<string> {
  const archivo = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${MIME_A_EXTENSION[file.mimetype] ?? ""}`;
  await prisma.imagenSala.create({
    data: { id: archivo, mime: file.mimetype, datos: file.buffer, tamano: file.size },
  });
  return `${PREFIJO_SALAS}${archivo}`;
}

/** Devuelve la imagen para servirla, o null si no existe. */
export async function leerImagenSala(archivo: string) {
  return prisma.imagenSala.findUnique({
    where: { id: archivo },
    select: { mime: true, datos: true },
  });
}

/** Normaliza a URL relativa: la web puede mandar de vuelta la URL completa que le dimos. */
export function urlRelativaImagen(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  const base = env.BACKEND_URL.replace(/\/+$/, "");
  return url.startsWith(base + PREFIJO_SALAS) ? url.slice(base.length) : url;
}

/** URL absoluta para la web (que vive en otro dominio, Vercel). Las URLs externas no se tocan. */
export function urlPublicaImagen(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith(PREFIJO_SALAS) ? `${env.BACKEND_URL.replace(/\/+$/, "")}${url}` : url;
}

/** Borra una imagen propia (las URLs externas se ignoran). No lanza errores. */
export function eliminarArchivoDeImagen(imagenUrl: string | null | undefined): void {
  const relativa = urlRelativaImagen(imagenUrl);
  if (!relativa || !relativa.startsWith(PREFIJO_SALAS)) return;

  const archivo = relativa.slice(PREFIJO_SALAS.length);
  prisma.imagenSala
    .deleteMany({ where: { id: archivo } })
    .catch((err) =>
      console.error(`[uploads] No se pudo eliminar la imagen ${archivo}:`, err?.message ?? err),
    );
}
