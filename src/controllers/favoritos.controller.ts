import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as favoritosService from "../services/favoritos.service";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const favoritos = await favoritosService.getFavoritos(req.usuario!.id);
  res.status(200).json({ ok: true, favoritos });
});

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const favoritos = await favoritosService.toggleFavorito(req.usuario!.id, req.params.salaId);
  res.status(200).json({ ok: true, favoritos });
});
