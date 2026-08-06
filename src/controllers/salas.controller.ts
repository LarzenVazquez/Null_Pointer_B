import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as salasService from "../services/salas.service";

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const salas = await salasService.listarSalas();
  res.status(200).json({ ok: true, salas });
});

export const obtenerPorId = asyncHandler(async (req: Request, res: Response) => {
  const sala = await salasService.obtenerSalaPorId(req.params.id);
  res.status(200).json({ ok: true, sala });
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const sala = await salasService.actualizarSala(req.params.id, req.body);
  res.status(200).json({ ok: true, sala });
});
