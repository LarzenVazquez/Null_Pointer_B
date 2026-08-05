import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as mensajesService from "../services/mensajes.service";
import { MensajeOrigen } from "../services/mensajes.service";

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const { nombre, email, asunto, mensaje, origen } = req.body;

  const nuevo = mensajesService.crearMensaje({
    nombre,
    email,
    asunto,
    mensaje,
    origen,
    // usuarioId sale del token (req.usuario), NUNCA del body: así nadie
    // puede hacerse pasar por otro usuario en el mensaje.
    usuarioId: req.usuario?.id,
  });

  res.status(201).json({ ok: true, mensaje: nuevo });
});

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const origen = req.query.origen as MensajeOrigen | undefined;

  if (origen && origen !== "contacto" && origen !== "soporte") {
    throw ApiError.badRequest(
      "El parámetro 'origen' debe ser 'contacto' o 'soporte'",
    );
  }

  const lista = mensajesService.listarMensajes(origen);
  res.status(200).json({ ok: true, mensajes: lista });
});

export const marcarRespondido = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const actualizado = mensajesService.marcarComoRespondido(id);
    if (!actualizado) {
      throw ApiError.noEncontrado(`No existe un mensaje con id '${id}'`);
    }

    res.status(200).json({ ok: true, mensaje: actualizado });
  },
);
