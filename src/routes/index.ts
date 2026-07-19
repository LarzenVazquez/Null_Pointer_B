import { Router } from "express";
import authRoutes from "./auth.routes";
import usuariosRoutes from "./usuarios.routes";
import eventosRoutes from "./eventos.routes";
import modulosRoutes from "./modulos.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    mensaje: "API de autenticación y autorización (Prácticas 9 y 10)",
    endpoints: {
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      eventos: "/api/eventos",
      modulos: "/api/modulos",
    },
  });
});

router.use("/auth", authRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/eventos", eventosRoutes);
router.use("/modulos", modulosRoutes);

export default router;
