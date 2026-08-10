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
  res.status(200).json({
    status: "200",
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
