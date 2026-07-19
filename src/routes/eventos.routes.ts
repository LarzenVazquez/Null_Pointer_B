import { Router } from "express";
import * as eventosController from "../controllers/eventos.controller";

// API pública: la barra de temas se muestra a cualquier visitante,
// esté o no autenticado, así que estas rutas NO llevan requireAuth.
const router = Router();

router.get("/", eventosController.listar);
router.get("/activo", eventosController.activo);
router.get("/:tipo", eventosController.obtenerPorTipo);

export default router;
