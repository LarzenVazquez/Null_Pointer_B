import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

/**
 * requireRole("Administrador", "Editor")
 * ---------------------------------------
 * Autoriza si el usuario autenticado tiene AL MENOS UNO de los roles
 * indicados. Debe usarse siempre después de requireAuth.
 */
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

/**
 * requirePermission("usuarios.crear", "usuarios.editar")
 * --------------------------------------------------------
 * Autorización más granular basada en permisos (tabla `permisos`,
 * vía `rol_permiso`). Por defecto exige TODOS los permisos listados;
 * pasa { modo: "alguno" } para exigir solo uno.
 */
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

/**
 * requireSelfOrRole("Administrador")
 * -----------------------------------
 * Permite la acción si el usuario autenticado es el mismo del recurso
 * (:id de la ruta) O si tiene alguno de los roles indicados.
 * Ej: un usuario puede editar SU propio perfil; un admin puede editar cualquiera.
 */
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
