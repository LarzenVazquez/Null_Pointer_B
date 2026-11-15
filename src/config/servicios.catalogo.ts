/**
 * Catálogo oficial de servicios adicionales y sus precios.
 *
 * El backend es la única fuente de verdad del precio: al crear una reserva se ignoran
 * los precios que manda el cliente y se recalculan con este catálogo.
 * Si cambias un precio aquí, actualiza también el catálogo de la web
 * (Null_Pointer_F/src/app/core/services/servicios.service.ts), que solo lo muestra.
 */
export const SERVICIOS_IDS = ["grabacion", "mastering", "entrega_masters"] as const;
export type ServicioId = (typeof SERVICIOS_IDS)[number];

export interface ServicioCatalogo {
  id: ServicioId;
  nombre: string;
  /** Precio en pesos por unidad (hora o pista). */
  precio: number;
  /** true = se cobra por cantidad (pistas); false = se cobra una sola vez por reserva. */
  requiereCantidad: boolean;
}

export const CATALOGO_SERVICIOS: Record<ServicioId, ServicioCatalogo> = {
  grabacion: {
    id: "grabacion",
    nombre: "Grabación de audio",
    precio: 350,
    requiereCantidad: false,
  },
  mastering: {
    id: "mastering",
    nombre: "Mastering",
    precio: 450,
    requiereCantidad: true,
  },
  entrega_masters: {
    id: "entrega_masters",
    nombre: "Entrega de masters",
    precio: 80,
    requiereCantidad: true,
  },
};

/** Máximo de pistas por servicio en una sola reserva (evita totales absurdos). */
export const MAX_CANTIDAD_SERVICIO = 50;
