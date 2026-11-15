import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import apiRouter from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { leerImagenSala } from "./middlewares/upload.middleware";

export const app = express();

// Render pone un proxy delante: así req.ip es la IP real del visitante (limitador de intentos).
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Imágenes de salas: se sirven desde la base de datos (ver upload.middleware.ts).
app.get(`${env.UPLOADS_URL_PREFIX}/salas/:archivo`, async (req, res, next) => {
  try {
    const imagen = await leerImagenSala(req.params.archivo);
    if (!imagen) return res.status(404).end();
    res.setHeader("Content-Type", imagen.mime);
    // El nombre de archivo es único y nunca cambia: el navegador puede guardarla un año.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(imagen.datos));
  } catch (err) {
    next(err);
  }
});

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
