import { Router } from "express";
import * as mensajesController from "../controllers/mensajes.controller";
import { requireAuth, optionalAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  nuevoMensajeSchema,
  idMensajeParamSchema,
} from "../validators/mensajes.validators";

const router = Router();

router.post(
  "/",
  optionalAuth,
  validate(nuevoMensajeSchema),
  mensajesController.crear,
);

router.use(requireAuth, requireRole("Administrador", "Editor"));

router.get("/", mensajesController.listar);

router.patch(
  "/:id/estado",
  validate(idMensajeParamSchema, "params"),
  mensajesController.marcarRespondido,
);

export default router;
