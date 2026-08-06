import { Router } from "express";
import * as salasController from "../controllers/salas.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { idSalaParamSchema, actualizarSalaSchema } from "../validators/salas.validators";

const router = Router();

router.get("/", salasController.listar);
router.get("/:id", validate(idSalaParamSchema, "params"), salasController.obtenerPorId);

router.patch(
  "/:id",
  requireAuth,
  requireRole("Administrador", "Editor"),
  validate(idSalaParamSchema, "params"),
  validate(actualizarSalaSchema),
  salasController.actualizar,
);

export default router;
