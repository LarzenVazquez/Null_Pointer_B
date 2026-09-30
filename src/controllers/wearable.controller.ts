import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as wearableService from "../services/wearable.service";
import * as notificacionesService from "../services/notificaciones.service";

// ───────────── Vinculación (públicas / web) ─────────────

export const solicitarVinculacion = asyncHandler(async (req: Request, res: Response) => {
  const datos = await wearableService.solicitarVinculacion(req.body);
  res.status(201).json({ ok: true, ...datos });
});

export const estadoVinculacion = asyncHandler(async (req: Request, res: Response) => {
  const datos = await wearableService.consultarVinculacion(req.body.deviceCode);
  res.status(200).json({ ok: true, ...datos });
});

export const confirmarVinculacion = asyncHandler(async (req: Request, res: Response) => {
  const dispositivo = await wearableService.confirmarVinculacion(req.usuario!.id, req.body.codigo);
  res.status(200).json({
    ok: true,
    mensaje: `Listo. "${dispositivo.nombre}" terminará de vincularse en unos segundos.`,
    dispositivo,
  });
});

// ───────────── Web: gestión de mis relojes ─────────────

export const listarMisDispositivos = asyncHandler(async (req: Request, res: Response) => {
  const dispositivos = await wearableService.listarDispositivosDeUsuario(req.usuario!.id);
  res.status(200).json({ ok: true, dispositivos });
});

export const eliminarMiDispositivo = asyncHandler(async (req: Request, res: Response) => {
  const r = await wearableService.eliminarDispositivo(Number(req.params.id), req.usuario!.id);
  res.status(200).json({ ok: true, ...r });
});

export const enviarPrueba = asyncHandler(async (req: Request, res: Response) => {
  const notificacion = await wearableService.enviarPrueba(req.usuario!.id, req.body.tipo);
  res.status(201).json({ ok: true, notificacion });
});

// ───────────── Reloj (X-Device-Token) ─────────────

export const perfilDispositivo = asyncHandler(async (req: Request, res: Response) => {
  const datos = await wearableService.obtenerDispositivo(req.dispositivo!.id);
  res.status(200).json({ ok: true, ...datos });
});

export const resumen = asyncHandler(async (req: Request, res: Response) => {
  const datos = await wearableService.resumen(req.dispositivo!.usuarioId);
  res.status(200).json({ ok: true, ...datos });
});

export const proximasReservas = asyncHandler(async (req: Request, res: Response) => {
  const reservas = await wearableService.proximasReservas(req.dispositivo!.usuarioId);
  res.status(200).json({ ok: true, reservas });
});

export const registrarFcmToken = asyncHandler(async (req: Request, res: Response) => {
  const dispositivo = await wearableService.registrarFcmToken(req.dispositivo!.id, req.body.fcmToken);
  res.status(200).json({ ok: true, dispositivo });
});

export const darDeBajaFcmToken = asyncHandler(async (req: Request, res: Response) => {
  const dispositivo = await wearableService.darDeBajaFcmToken(req.dispositivo!.id);
  res.status(200).json({ ok: true, dispositivo });
});

export const desvincularDesdeReloj = asyncHandler(async (req: Request, res: Response) => {
  const r = await wearableService.eliminarDispositivo(req.dispositivo!.id, req.dispositivo!.usuarioId);
  res.status(200).json({ ok: true, ...r });
});

export const listarNotificaciones = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { limite?: number; soloNoLeidas?: boolean; desde?: Date };
  const datos = await notificacionesService.listarDeUsuario(req.dispositivo!.usuarioId, q);
  res.status(200).json({ ok: true, ...datos });
});

export const marcarLeida = asyncHandler(async (req: Request, res: Response) => {
  const notificacion = await notificacionesService.marcarLeida(req.params.id, req.dispositivo!.usuarioId);
  res.status(200).json({ ok: true, notificacion });
});

export const marcarTodasLeidas = asyncHandler(async (req: Request, res: Response) => {
  const actualizadas = await notificacionesService.marcarTodasLeidas(req.dispositivo!.usuarioId);
  res.status(200).json({ ok: true, actualizadas });
});
