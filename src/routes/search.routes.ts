import { Router } from "express";
import { buscar, reindexar } from "../controllers/search.controller";

const router = Router();

router.get("/buscar", buscar);
router.post("/reindexar", reindexar);

export default router;
