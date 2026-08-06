import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as reservasService from "../services/reservas.service";

export const listarPropias = asyncHandler(async (req: Request, res: Response) => {
  const reservas = await reservasService.getReservasDeUsuario(req.usuario!.id);
  res.status(200).json({ ok: true, reservas });
});

export const listarTodas = asyncHandler(async (_req: Request, res: Response) => {
  const reservas = await reservasService.getAllReservas();
  res.status(200).json({ ok: true, reservas });
});

export const obtenerPorId = asyncHandler(async (req: Request, res: Response) => {
  const reserva = await reservasService.getReservaById(req.params.id);
  res.status(200).json({ ok: true, reserva });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const reserva = await reservasService.crearReserva({
    usuarioId: req.usuario!.id,
    salaId: req.body.salaId,
    fecha: req.body.fecha,
    hora: req.body.hora,
    duracionHoras: req.body.duracionHoras,
    servicios: req.body.servicios ?? [],
    notas: req.body.notas,
  });
  res.status(201).json({ ok: true, reserva });
});

export const actualizarEstado = asyncHandler(async (req: Request, res: Response) => {
  const { estado } = req.body;
  const estadosValidos = ["pendiente", "confirmada", "completada", "cancelada"];
  if (!estadosValidos.includes(estado)) {
    throw ApiError.badRequest(`El estado debe ser uno de: ${estadosValidos.join(", ")}`);
  }

  const reserva = await reservasService.actualizarEstado(req.params.id, estado);
  res.status(200).json({ ok: true, reserva });
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  const esAdmin = req.usuario!.roles.includes("Administrador");
  const reserva = await reservasService.cancelarReserva(
    req.params.id,
    esAdmin ? undefined : req.usuario!.id,
  );
  res.status(200).json({ ok: true, reserva });
});
