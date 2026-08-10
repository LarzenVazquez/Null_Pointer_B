import { Router, Request, Response, NextFunction } from "express";
import { buscar, reindexar } from "../controllers/search.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { ApiError } from "../utils/ApiError";

const router = Router();

const verificarAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.usuario || !req.usuario.roles.includes("Administrador")) {
    return next(ApiError.noAutorizado("No tienes permisos de administrador"));
  }
  next();
};

router.use(requireAuth, verificarAdmin);

router.get("/buscar", buscar);
router.post("/reindexar", reindexar);

export default router;
