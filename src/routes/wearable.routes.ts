import { Router } from "express";
import * as wearableController from "../controllers/wearable.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { requireWearable } from "../middlewares/wearableAuth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  confirmarVinculacionSchema,
  estadoVinculacionSchema,
  fcmTokenSchema,
  idDispositivoParamSchema,
  idNotificacionParamSchema,
  listarNotificacionesQuerySchema,
  pruebaSchema,
  solicitarVinculacionSchema,
} from "../validators/wearable.validators";

/**
 * /api/wearable
 *
 *  Vinculación
 *   POST   /vinculacion/solicitar        (reloj, público)   -> código de 6 dígitos + deviceCode
 *   POST   /vinculacion/estado           (reloj, público)   -> pendiente | vinculado | expirado
 *   POST   /vinculacion/confirmar        (web, JWT Usuario) -> asocia el código a la cuenta
 *
 *  Web (JWT)
 *   GET    /dispositivos                 -> mis relojes
 *   DELETE /dispositivos/:id             -> dar de baja un reloj
 *   POST   /prueba                       -> enviar aviso de prueba { tipo }
 *
 *  Reloj (X-Device-Token)
 *   GET    /me | DELETE /me              -> datos del reloj / desvincular desde el reloj
 *   PUT    /fcm-token | DELETE /fcm-token-> registrar o dar de baja el token push
 *   GET    /resumen                      -> pantalla de inicio
 *   GET    /reservas/proximas
 *   GET    /notificaciones               -> ?limite=&soloNoLeidas=&desde=
 *   PATCH  /notificaciones/leidas        -> marcar todas
 *   PATCH  /notificaciones/:id/leida
 */
const router = Router();

// ── Vinculación ──
router.post(
  "/vinculacion/solicitar",
  validate(solicitarVinculacionSchema),
  wearableController.solicitarVinculacion,
);
router.post(
  "/vinculacion/estado",
  validate(estadoVinculacionSchema),
  wearableController.estadoVinculacion,
);
router.post(
  "/vinculacion/confirmar",
  requireAuth,
  requireRole("Usuario"),
  validate(confirmarVinculacionSchema),
  wearableController.confirmarVinculacion,
);

// ── Web (JWT) ──
router.get("/dispositivos", requireAuth, wearableController.listarMisDispositivos);
router.delete(
  "/dispositivos/:id",
  requireAuth,
  validate(idDispositivoParamSchema, "params"),
  wearableController.eliminarMiDispositivo,
);
router.post("/prueba", requireAuth, validate(pruebaSchema), wearableController.enviarPrueba);

// ── Reloj (X-Device-Token) ──
router.get("/me", requireWearable, wearableController.perfilDispositivo);
router.delete("/me", requireWearable, wearableController.desvincularDesdeReloj);
router.put("/fcm-token", requireWearable, validate(fcmTokenSchema), wearableController.registrarFcmToken);
router.delete("/fcm-token", requireWearable, wearableController.darDeBajaFcmToken);
router.get("/resumen", requireWearable, wearableController.resumen);
router.get("/reservas/proximas", requireWearable, wearableController.proximasReservas);
router.get(
  "/notificaciones",
  requireWearable,
  validate(listarNotificacionesQuerySchema, "query"),
  wearableController.listarNotificaciones,
);
router.patch("/notificaciones/leidas", requireWearable, wearableController.marcarTodasLeidas);
router.patch(
  "/notificaciones/:id/leida",
  requireWearable,
  validate(idNotificacionParamSchema, "params"),
  wearableController.marcarLeida,
);

export default router;
