import { Router } from "express";
import * as eventosController from "../controllers/eventos.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/", eventosController.listar);
router.get("/activo", eventosController.activo);

// Fijar el tema de temporada afecta a todos los visitantes: solo un Administrador puede hacerlo.
router.post(
  "/fijar",
  requireAuth,
  requireRole("Administrador"),
  eventosController.fijar,
);

router.get("/:tipo", eventosController.obtenerPorTipo);

export default router;
