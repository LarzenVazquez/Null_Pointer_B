import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import * as modulosController from "../controllers/modulos.controller";

const router = Router();

router.use(requireAuth);

router.get(
  "/administrador",
  requireRole("Administrador"),
  modulosController.moduloAdministrador
);

router.get(
  "/editor",
  requireRole("Administrador", "Editor"),
  modulosController.moduloEditor
);

router.get(
  "/usuario",
  requireRole("Administrador", "Editor", "Usuario"),
  modulosController.moduloUsuario
);

export default router;
