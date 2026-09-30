import { z } from "zod";
import { TIPOS_NOTIFICACION } from "../services/notificaciones.service";

export const solicitarVinculacionSchema = z.object({
  nombre: z.string().trim().min(1).max(60).default("Mi reloj"),
  modelo: z.string().trim().max(80).optional(),
});

export const confirmarVinculacionSchema = z.object({
  codigo: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 6, "El código debe tener 6 dígitos"),
});

export const estadoVinculacionSchema = z.object({
  deviceCode: z.string().trim().min(20, "deviceCode inválido").max(200),
});

export const fcmTokenSchema = z.object({
  fcmToken: z.string().trim().min(20, "Token FCM inválido").max(4096),
});

export const idDispositivoParamSchema = z.object({
  id: z.coerce.number().int().positive("Id de dispositivo inválido"),
});

export const idNotificacionParamSchema = z.object({
  id: z.string().uuid("Id de notificación inválido"),
});

export const listarNotificacionesQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).optional(),
  soloNoLeidas: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  desde: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const pruebaSchema = z.object({
  tipo: z.enum(TIPOS_NOTIFICACION).default("reserva_confirmada"),
});
