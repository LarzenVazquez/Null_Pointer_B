import { Router } from "express";
import * as salasController from "../controllers/salas.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { uploadImagenSala } from "../middlewares/upload.middleware";
import {
  idSalaParamSchema,
  crearSalaSchema,
  actualizarSalaSchema,
} from "../validators/salas.validators";

const router = Router();

// Endpoints públicos: cualquiera puede ver el catálogo de salas.
router.get("/", salasController.listar);
router.get("/:id", validate(idSalaParamSchema, "params"), salasController.obtenerPorId);

// A partir de aquí, todo requiere sesión y permisos de gestión de salas.
router.post(
  "/",
  requireAuth,
  requirePermission(["salas.crear"]),
  uploadImagenSala,
  validate(crearSalaSchema),
  salasController.crear,
);

router.patch(
  "/:id",
  requireAuth,
  requirePermission(["salas.editar"]),
  validate(idSalaParamSchema, "params"),
  uploadImagenSala,
  validate(actualizarSalaSchema),
  salasController.actualizar,
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission(["salas.eliminar"]),
  validate(idSalaParamSchema, "params"),
  salasController.eliminar,
);

export default router;
