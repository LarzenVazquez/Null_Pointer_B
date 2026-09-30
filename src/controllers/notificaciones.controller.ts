import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as notificacionesService from "../services/notificaciones.service";

/** Historial de avisos visto desde la web (sesión JWT). */
export const listar = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { limite?: number; soloNoLeidas?: boolean; desde?: Date };
  const datos = await notificacionesService.listarDeUsuario(req.usuario!.id, q);
  res.status(200).json({ ok: true, ...datos });
});

export const marcarLeida = asyncHandler(async (req: Request, res: Response) => {
  const notificacion = await notificacionesService.marcarLeida(req.params.id, req.usuario!.id);
  res.status(200).json({ ok: true, notificacion });
});

export const marcarTodasLeidas = asyncHandler(async (req: Request, res: Response) => {
  const actualizadas = await notificacionesService.marcarTodasLeidas(req.usuario!.id);
  res.status(200).json({ ok: true, actualizadas });
});
