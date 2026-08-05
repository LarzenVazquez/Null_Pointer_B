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

// Público: el formulario de Contacto (sin sesión) y el de Soporte (con
// sesión) mandan aquí. optionalAuth adjunta req.usuario SOLO si hay un
// token válido, sin bloquear la petición cuando no lo hay.
router.post(
  "/",
  optionalAuth,
  validate(nuevoMensajeSchema),
  mensajesController.crear,
);

// De aquí para abajo: solo Administrador/Editor pueden ver y gestionar
// la bandeja de mensajes.
router.use(requireAuth, requireRole("Administrador", "Editor"));

router.get("/", mensajesController.listar);

router.patch(
  "/:id/estado",
  validate(idMensajeParamSchema, "params"),
  mensajesController.marcarRespondido,
);

export default router;
