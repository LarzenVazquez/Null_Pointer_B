import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import apiRouter from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

export const app = express();

// --- Seguridad de cabeceras HTTP (helmet aplica un set de defaults
// razonables: X-Content-Type-Options, X-Frame-Options, HSTS, etc.) ---
app.use(helmet());

// --- CORS: solo se permite el origen del frontend configurado, y se
// habilitan credenciales para poder mandar/recibir la cookie httpOnly
// del refresh token. ---
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Log simple de peticiones en desarrollo (útil para las capturas/video).
if (!env.isProduction) {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "up", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);

// 404 para rutas no definidas + manejador de errores centralizado.
// SIEMPRE al final, en ese orden.
app.use(notFoundHandler);
app.use(errorHandler);
