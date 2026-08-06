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

router.use(requireAuth);

router.get("/", requirePermission(["usuarios.ver"]), usuariosController.listar);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  requirePermission(["usuarios.ver"]),
  usuariosController.obtenerUno,
);

router.post(
  "/",
  requirePermission(["usuarios.crear"]),
  validate(crearUsuarioAdminSchema),
  usuariosController.crear,
);

router.put(
  "/:id",
  validate(idParamSchema, "params"),
  requirePermission(["usuarios.editar"]),
  validate(actualizarUsuarioSchema),
  usuariosController.actualizar,
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  requirePermission(["usuarios.eliminar"]),
  usuariosController.eliminar,
);

router.patch(
  "/:id/rol",
  validate(idParamSchema, "params"),
  requireRole("Administrador"),
  validate(cambiarRolSchema),
  usuariosController.cambiarRol,
);

router.patch(
  "/:id/estado",
  validate(idParamSchema, "params"),
  requireRole("Administrador"),
  usuariosController.cambiarEstado,
);

export default router;
