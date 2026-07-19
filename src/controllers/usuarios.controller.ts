import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as usuariosService from "../services/usuarios.service";

export const listar = asyncHandler(async (_req: Request, res: Response) => {
  const usuarios = await usuariosService.listarUsuarios();
  res.status(200).json({ ok: true, usuarios });
});

export const obtenerUno = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as { id: number };
  const usuario = await usuariosService.obtenerUsuarioPorId(id);
  res.status(200).json({ ok: true, usuario });
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const usuario = await usuariosService.crearUsuarioComoAdmin(req.body);
  res.status(201).json({ ok: true, usuario });
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as { id: number };
  const usuario = await usuariosService.actualizarUsuario(id, req.body);
  res.status(200).json({ ok: true, usuario });
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as { id: number };
  await usuariosService.eliminarUsuario(id);
  res.status(200).json({ ok: true, mensaje: "Usuario eliminado" });
});

export const cambiarRol = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as { id: number };
  const usuario = await usuariosService.cambiarRolUsuario(id, req.body.rol);
  res.status(200).json({ ok: true, usuario });
});
