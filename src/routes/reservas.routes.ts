import { Router } from "express";
import * as reservasController from "../controllers/reservas.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  idReservaParamSchema,
  nuevaReservaSchema,
  actualizarEstadoReservaSchema,
} from "../validators/reservas.validators";

const router = Router();

router.use(requireAuth);

router.get("/", reservasController.listarPropias);
router.post("/", validate(nuevaReservaSchema), reservasController.crear);

router.get(
  "/todas",
  requireRole("Administrador", "Editor"),
  reservasController.listarTodas,
);

router.get(
  "/:id",
  validate(idReservaParamSchema, "params"),
  reservasController.obtenerPorId,
);

router.patch(
  "/:id/estado",
  requireRole("Administrador", "Editor"),
  validate(idReservaParamSchema, "params"),
  validate(actualizarEstadoReservaSchema),
  reservasController.actualizarEstado,
);

router.patch(
  "/:id/cancelar",
  validate(idReservaParamSchema, "params"),
  reservasController.cancelar,
);

export default router;
