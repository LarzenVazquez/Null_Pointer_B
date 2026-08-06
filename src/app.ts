import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import apiRouter from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

export const app = express();

app.use(
  helmet({
    // Permite que las imágenes servidas desde /uploads se puedan cargar
    // desde el frontend (otro origen) sin ser bloqueadas por CORP.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Archivos estáticos gestionados por el backend (p. ej. imágenes de salas).
app.use(env.UPLOADS_URL_PREFIX, express.static(path.join(process.cwd(), env.UPLOADS_DIR)));

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

app.use(notFoundHandler);
app.use(errorHandler);
