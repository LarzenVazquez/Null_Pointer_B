import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { loginRateLimiter } from "../middlewares/rateLimit.middleware";
import { descifrarLogin } from "../middlewares/hybridDecrypt.middleware";
import {
  actualizarPerfilPropioSchema,
  loginSchema,
  registroSchema,
} from "../validators/auth.validators";

const router = Router();

// Llave pública para el cifrado híbrido del login (ver
// src/utils/hybridCrypto.utils.ts). Debe pedirse ANTES de cada intento
// de login; no requiere sesión.
router.get("/public-key", authController.publicKey);

router.post("/registro", validate(registroSchema), authController.registro);

router.post(
  "/login",
  loginRateLimiter,
  descifrarLogin,
  validate(loginSchema),
  authController.login,
);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Rutas protegidas: requieren un access token válido.
router.get("/perfil", requireAuth, authController.perfil);
router.put(
  "/perfil",
  requireAuth,
  validate(actualizarPerfilPropioSchema),
  authController.actualizarPerfil,
);
router.post("/logout-todos", requireAuth, authController.logoutTodos);

export default router;
