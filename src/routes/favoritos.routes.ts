import { Router } from "express";
import * as favoritosController from "../controllers/favoritos.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", favoritosController.listar);
router.post("/:salaId/toggle", favoritosController.toggle);

export default router;
