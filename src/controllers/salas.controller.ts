import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as salasService from "../services/salas.service";
import { construirUrlImagen } from "../middlewares/upload.middleware";

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const salas = await salasService.listarSalas();
  res.status(200).json({ ok: true, salas });
});

export const obtenerPorId = asyncHandler(async (req: Request, res: Response) => {
  const sala = await salasService.obtenerSalaPorId(req.params.id);
  res.status(200).json({ ok: true, sala });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const imagenSubidaUrl = req.file ? construirUrlImagen(req.file.filename) : undefined;
  const sala = await salasService.crearSala(req.body, imagenSubidaUrl);
  res.status(201).json({ ok: true, sala });
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const imagenSubidaUrl = req.file ? construirUrlImagen(req.file.filename) : undefined;
  const sala = await salasService.actualizarSala(req.params.id, req.body, imagenSubidaUrl);
  res.status(200).json({ ok: true, sala });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const forzar = req.query.forzar === "true" || req.query.forzar === "1";
  await salasService.eliminarSala(req.params.id, forzar);
  res.status(200).json({ ok: true, mensaje: "Sala eliminada correctamente" });
});
