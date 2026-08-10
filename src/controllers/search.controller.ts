import { Request, Response } from "express";
import {
  buscarGlobal,
  reindexarTodosLosUsuarios,
  reindexarConfiguracion,
} from "../services/search.service";

export async function buscar(req: Request, res: Response) {
  try {
    const query = (req.query.q as string) || "";
    const resultados = await buscarGlobal(query);
    return res.status(200).json({
      ok: true,
      ...resultados,
    });
  } catch (error: any) {
    console.error("[ERROR CRITICO EN RUTA /buscar]:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al realizar la busqueda",
      detalles: error.message || error,
    });
  }
}

export async function reindexar(_req: Request, res: Response) {
  try {
    const totalUsuarios = await reindexarTodosLosUsuarios();
    await reindexarConfiguracion();
    return res.status(200).json({
      ok: true,
      mensaje: `Reindexacion completada. Usuarios actualizados: ${totalUsuarios}`,
    });
  } catch (error: any) {
    console.error("[ERROR CRITICO EN REINDEXAR]:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error interno al reindexar",
      detalles: error.message || error,
    });
  }
}
