import fs from "fs";
import path from "path";
import { env } from "../config/env";

/**
 * Inicialización perezosa de Firebase Admin (Firebase Cloud Messaging).
 *
 * Es OPCIONAL: si no existe FIREBASE_SERVICE_ACCOUNT_PATH, el backend funciona igual,
 * guarda las notificaciones en la BD y el reloj las recoge por consulta periódica.
 */
type Messaging = import("firebase-admin/messaging").Messaging;

let messaging: Messaging | null = null;
let intentado = false;

export function obtenerMessaging(): Messaging | null {
  if (intentado) return messaging;
  intentado = true;

  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.log("[fcm] FIREBASE_SERVICE_ACCOUNT_PATH no definido → modo polling (sin push).");
    return null;
  }

  try {
    const ruta = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const cuenta = JSON.parse(fs.readFileSync(ruta, "utf8"));

    // Import dinámico para no cargar firebase-admin si no se usa.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp, cert, getApps } = require("firebase-admin/app");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMessaging } = require("firebase-admin/messaging");

    const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(cuenta) });
    messaging = getMessaging(app);
    console.log(`[fcm] Firebase Cloud Messaging listo (proyecto: ${cuenta.project_id}).`);
  } catch (err) {
    console.warn("[fcm] No se pudo inicializar Firebase. Se usará modo polling.", err);
    messaging = null;
  }
  return messaging;
}
