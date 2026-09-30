import { Router } from "express";
import * as notificacionesController from "../controllers/notificaciones.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  idNotificacionParamSchema,
  listarNotificacionesQuerySchema,
} from "../validators/wearable.validators";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listarNotificacionesQuerySchema, "query"), notificacionesController.listar);
router.patch("/leidas", notificacionesController.marcarTodasLeidas);
router.patch(
  "/:id/leida",
  validate(idNotificacionParamSchema, "params"),
  notificacionesController.marcarLeida,
);

export default router;
