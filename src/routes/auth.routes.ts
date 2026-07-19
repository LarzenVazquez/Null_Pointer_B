import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { loginRateLimiter } from "../middlewares/rateLimit.middleware";
import {
  actualizarPerfilPropioSchema,
  loginSchema,
  registroSchema,
} from "../validators/auth.validators";

const router = Router();

router.post("/registro", validate(registroSchema), authController.registro);

router.post(
  "/login",
  loginRateLimiter,
  validate(loginSchema),
  authController.login
);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Rutas protegidas: requieren un access token válido.
router.get("/perfil", requireAuth, authController.perfil);
router.put(
  "/perfil",
  requireAuth,
  validate(actualizarPerfilPropioSchema),
  authController.actualizarPerfil
);
router.post("/logout-todos", requireAuth, authController.logoutTodos);

export default router;
