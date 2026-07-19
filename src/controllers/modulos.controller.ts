import { Request, Response } from "express";

/**
 * Estos tres endpoints existen únicamente como EVIDENCIA clara de la
 * Parte 3 (Control de acceso): cada uno exige un rol distinto vía
 * middleware (ver routes/modulos.routes.ts) y devuelve quién entró,
 * ideal para las capturas de pantalla / video demostrativo.
 */

export function moduloAdministrador(req: Request, res: Response) {
  res.status(200).json({
    ok: true,
    modulo: "Panel de Administrador",
    mensaje: `Bienvenido ${req.usuario?.nombre}. Este módulo es exclusivo del rol Administrador.`,
    usuario: req.usuario,
  });
}

export function moduloEditor(req: Request, res: Response) {
  res.status(200).json({
    ok: true,
    modulo: "Panel de Editor",
    mensaje: `Bienvenido ${req.usuario?.nombre}. Este módulo es para Administrador y Editor.`,
    usuario: req.usuario,
  });
}

export function moduloUsuario(req: Request, res: Response) {
  res.status(200).json({
    ok: true,
    modulo: "Panel de Usuario",
    mensaje: `Bienvenido ${req.usuario?.nombre}. Cualquier usuario autenticado puede ver esto.`,
    usuario: req.usuario,
  });
}
