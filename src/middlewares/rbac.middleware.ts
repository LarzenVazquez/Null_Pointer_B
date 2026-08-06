import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export function requireRole(...rolesPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(ApiError.noAutorizado());
    }

    const tieneRol = req.usuario.roles.some((r) =>
      rolesPermitidos.includes(r)
    );

    if (!tieneRol) {
      return next(
        ApiError.prohibido(
          `Acceso restringido. Se requiere alguno de estos roles: ${rolesPermitidos.join(
            ", "
          )}`
        )
      );
    }

    next();
  };
}

export function requirePermission(
  permisosRequeridos: string[],
  opciones: { modo?: "todos" | "alguno" } = {}
) {
  const modo = opciones.modo ?? "todos";

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(ApiError.noAutorizado());
    }

    const permisosUsuario = new Set(req.usuario.permisos);

    const autorizado =
      modo === "todos"
        ? permisosRequeridos.every((p) => permisosUsuario.has(p))
        : permisosRequeridos.some((p) => permisosUsuario.has(p));

    if (!autorizado) {
      return next(
        ApiError.prohibido(
          `No cuentas con el/los permiso(s) necesarios: ${permisosRequeridos.join(
            ", "
          )}`
        )
      );
    }

    next();
  };
}

export function requireSelfOrRole(...rolesPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(ApiError.noAutorizado());

    const idParam = Number(req.params.id);
    const esElMismo = req.usuario.id === idParam;
    const tieneRol = req.usuario.roles.some((r) =>
      rolesPermitidos.includes(r)
    );

    if (!esElMismo && !tieneRol) {
      return next(ApiError.prohibido());
    }

    next();
  };
}
