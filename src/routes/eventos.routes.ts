import { Router } from "express";
import * as eventosController from "../controllers/eventos.controller";
import {
  setEventoFijado,
  obtenerEventoActivo,
} from "../services/eventos.service";

const router = Router();

router.get("/", eventosController.listar);
router.get("/activo", eventosController.activo);

router.post("/fijar", (req, res) => {
  const { tipo } = req.body;
  setEventoFijado(tipo || null);
  res.json({
    ok: true,
    mensaje: "Evento fijado globalmente en la memoria del servidor",
    evento: obtenerEventoActivo(),
  });
});

router.get("/:tipo", eventosController.obtenerPorTipo);

export default router;
