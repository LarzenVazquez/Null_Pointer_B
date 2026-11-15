import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as salasService from "../services/salas.service";
import { eliminarArchivoDeImagen, guardarImagenSala } from "../middlewares/upload.middleware";

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const salas = await salasService.listarSalas();
  res.status(200).json({ ok: true, salas });
});

export const obtenerPorId = asyncHandler(async (req: Request, res: Response) => {
  const sala = await salasService.obtenerSalaPorId(req.params.id);
  res.status(200).json({ ok: true, sala });
});

/** Guarda la imagen subida (si hay) y la borra si la operación falla, para no dejar huérfanas. */
async function conImagenSubida<T>(
  req: Request,
  operacion: (imagenUrl?: string) => Promise<T>,
): Promise<T> {
  const imagenUrl = req.file ? await guardarImagenSala(req.file) : undefined;
  try {
    return await operacion(imagenUrl);
  } catch (err) {
    eliminarArchivoDeImagen(imagenUrl);
    throw err;
  }
}

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const sala = await conImagenSubida(req, (url) => salasService.crearSala(req.body, url));
  res.status(201).json({ ok: true, sala });
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const sala = await conImagenSubida(req, (url) =>
    salasService.actualizarSala(req.params.id, req.body, url),
  );
  res.status(200).json({ ok: true, sala });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const forzar = req.query.forzar === "true" || req.query.forzar === "1";
  await salasService.eliminarSala(req.params.id, forzar);
  res.status(200).json({ ok: true, mensaje: "Sala eliminada correctamente" });
});
