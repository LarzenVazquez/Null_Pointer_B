import { Router } from "express";

import authRoutes from "./auth.routes";
import usuariosRoutes from "./usuarios.routes";
import eventosRoutes from "./eventos.routes";
import modulosRoutes from "./modulos.routes";
import searchRoutes from "./search.routes";
import mensajesRoutes from "./mensajes.routes";
import salasRoutes from "./salas.routes";
import reservasRoutes from "./reservas.routes";
import favoritosRoutes from "./favoritos.routes";

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
      mensajes: "/api/mensajes (crear: público, listar/gestionar: Administrador/Editor)",
      salas: "/api/salas",
      reservas: "/api/reservas (requiere sesión)",
      favoritos: "/api/favoritos (requiere sesión)",
      admin: "/api/admin (solo Administrador)",
    },
  });
});

router.use("/auth", authRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/eventos", eventosRoutes);
router.use("/modulos", modulosRoutes);
router.use("/mensajes", mensajesRoutes);
router.use("/salas", salasRoutes);
router.use("/reservas", reservasRoutes);
router.use("/favoritos", favoritosRoutes);
router.use("/admin", searchRoutes);

export default router;
