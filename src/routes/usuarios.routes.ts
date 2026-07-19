import { Router } from "express";
import * as usuariosController from "../controllers/usuarios.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission, requireRole } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  actualizarUsuarioSchema,
  cambiarRolSchema,
  crearUsuarioAdminSchema,
  idParamSchema,
} from "../validators/usuarios.validators";

const router = Router();

// TODA esta sección requiere estar autenticado. Sin esto, cualquier
// intento de acceder directamente a /api/usuarios (por URL, Postman, etc.)
// se corta de inmediato con 401, sin importar el rol.
router.use(requireAuth);

router.get(
  "/",
  requirePermission(["usuarios.ver"]),
  usuariosController.listar
);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  requirePermission(["usuarios.ver"]),
  usuariosController.obtenerUno
);

router.post(
  "/",
  requirePermission(["usuarios.crear"]),
  validate(crearUsuarioAdminSchema),
  usuariosController.crear
);

router.put(
  "/:id",
  validate(idParamSchema, "params"),
  requirePermission(["usuarios.editar"]),
  validate(actualizarUsuarioSchema),
  usuariosController.actualizar
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  requirePermission(["usuarios.eliminar"]),
  usuariosController.eliminar
);

// Cambiar el rol de un usuario es una operación sensible: solo Administrador,
// sin importar los permisos granulares que tenga el que hace la petición.
router.patch(
  "/:id/rol",
  validate(idParamSchema, "params"),
  requireRole("Administrador"),
  validate(cambiarRolSchema),
  usuariosController.cambiarRol
);

export default router;
