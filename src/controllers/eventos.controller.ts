import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as eventosService from "../services/eventos.service";
import { EventoTipo } from "../services/eventos.service";

/**
 * GET /api/eventos
 * Lista todos los temas estacionales configurados (público).
 */
export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const eventos = eventosService.listarEventos();
  res.status(200).json({ ok: true, eventos });
});

/**
 * GET /api/eventos/activo?fecha=YYYY-MM-DD
 * Devuelve el evento activo para la fecha indicada (o "hoy" si se omite).
 * Es el endpoint que alimenta la barra "Simular fecha" / "Evento activo".
 */
export const activo = asyncHandler(async (req: Request, res: Response) => {
  const { fecha } = req.query;

  let fechaConsulta = new Date();

  if (typeof fecha === "string" && fecha.trim() !== "") {
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      throw ApiError.badRequest(
        "El parámetro 'fecha' debe tener formato válido, ej. 2026-12-25"
      );
    }
    fechaConsulta = parsed;
  }

  const evento = eventosService.obtenerEventoActivo(fechaConsulta);
  res.status(200).json({
    ok: true,
    fechaConsultada: fechaConsulta.toISOString().slice(0, 10),
    evento,
  });
});

/**
 * GET /api/eventos/:tipo
 * Devuelve la definición completa de un tema puntual, útil para
 * previsualizar un evento sin tener que calcular su rango de fechas
 * (equivalente a los botones "Navidad", "Halloween", etc. de la barra).
 */
export const obtenerPorTipo = asyncHandler(
  async (req: Request, res: Response) => {
    const tipo = req.params.tipo as EventoTipo;

    if (!eventosService.tiposValidos().includes(tipo)) {
      throw ApiError.noEncontrado(
        `El tipo de evento '${tipo}' no existe. Tipos válidos: ${eventosService
          .tiposValidos()
          .join(", ")}`
      );
    }

    const evento = eventosService.obtenerEventoPorTipo(tipo);
    res.status(200).json({ ok: true, evento });
  }
);
