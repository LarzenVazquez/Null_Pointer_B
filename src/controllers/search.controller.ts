import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as searchService from "../services/search.service";

export const buscar = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) ?? "";

  if (!q.trim()) {
    throw ApiError.badRequest("Debes enviar un parámetro 'q' para buscar");
  }

  const resultados = await searchService.buscarGlobal(q);
  res.status(200).json({ ok: true, query: q, resultados });
});

export const reindexar = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsuarios] = await Promise.all([
    searchService.reindexarTodosLosUsuarios(),
    searchService.reindexarConfiguracion(),
  ]);

  res.status(200).json({
    ok: true,
    mensaje: "Reindexado completo",
    usuariosIndexados: totalUsuarios,
  });
});
