export type EventoTipo =
  | "default"
  | "navidad"
  | "anio_nuevo"
  | "dia_muertos"
  | "halloween"
  | "san_valentin";

export interface EventoCalendario {
  tipo: EventoTipo;
  nombre: string;
  banner: string;
  descripcion: string;
  accentColor: string;
  accent2: string;
  bgColor: string;
  surfaceColor: string;
  emoji: string;
  particles: string[];
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

const EVENTOS: Record<EventoTipo, EventoCalendario> = {
  navidad: {
    tipo: "navidad",
    nombre: "Navidad",
    banner: "Oferta Navideña - 20% off en ensayos del 20 al 31 de diciembre",
    descripcion: "Toca villancicos en nuestras salas esta temporada.",
    accentColor: "#00C853",
    accent2: "#ff0000",
    bgColor: "#001a00",
    surfaceColor: "#003300",
    emoji: "",
    particles: [],
    startMonth: 12,
    startDay: 20,
    endMonth: 12,
    endDay: 31,
  },
  anio_nuevo: {
    tipo: "anio_nuevo",
    nombre: "Año Nuevo",
    banner: "Año Nuevo - ¡Estrena el año tocando con tu banda!",
    descripcion: "Empieza el año con el pie derecho... y con tu instrumento.",
    accentColor: "#FFD700",
    accent2: "#ff8c00",
    bgColor: "#1a1400",
    surfaceColor: "#332800",
    emoji: "",
    particles: [],
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 5,
  },
  dia_muertos: {
    tipo: "dia_muertos",
    nombre: "Día de Muertos",
    banner: "Día de Muertos - Toca para los que ya no están",
    descripcion: "Honra a quienes te enseñaron a amar la música.",
    accentColor: "#FF6B00",
    accent2: "#ffcc00",
    bgColor: "#1a0800",
    surfaceColor: "#2d1200",
    emoji: "",
    particles: [],
    startMonth: 11,
    startDay: 1,
    endMonth: 11,
    endDay: 2,
  },
  halloween: {
    tipo: "halloween",
    nombre: "Halloween",
    banner: "Halloween - Ensaya de noche, suena de miedo",
    descripcion: "Las mejores sesiones ocurren en la oscuridad.",
    accentColor: "#FF6600",
    accent2: "#9b30ff",
    bgColor: "#0d0500",
    surfaceColor: "#1a0a00",
    emoji: "",
    particles: [],
    startMonth: 10,
    startDay: 28,
    endMonth: 10,
    endDay: 31,
  },
  san_valentin: {
    tipo: "san_valentin",
    nombre: "San Valentín",
    banner: "San Valentín - Dedícale una canción a quien amas",
    descripcion: "La música es el mejor regalo. Reserva una sala para dos.",
    accentColor: "#FF1A6E",
    accent2: "#ff69b4",
    bgColor: "#1a0010",
    surfaceColor: "#2d0020",
    emoji: "",
    particles: [],
    startMonth: 2,
    startDay: 10,
    endMonth: 2,
    endDay: 14,
  },
  default: {
    tipo: "default",
    nombre: "",
    banner: "",
    descripcion: "Salas de ensayo profesionales con acústica de estudio.",
    accentColor: "#C8FF00",
    accent2: "#ff4d00",
    bgColor: "#0a0a0a",
    surfaceColor: "#1a1a1a",
    emoji: "",
    particles: [],
    startMonth: 0,
    startDay: 0,
    endMonth: 0,
    endDay: 0,
  },
};

// Variable en memoria del servidor para mantener el evento fijado
let eventoFijadoGlobal: EventoTipo | null = null;

export function setEventoFijado(tipo: EventoTipo | null): void {
  eventoFijadoGlobal = tipo;
}

export function getEventoFijado(): EventoTipo | null {
  return eventoFijadoGlobal;
}

function estaEnRango(mes: number, dia: number, ev: EventoCalendario): boolean {
  if (ev.startMonth === ev.endMonth) {
    return mes === ev.startMonth && dia >= ev.startDay && dia <= ev.endDay;
  }
  const despuesDeInicio =
    mes > ev.startMonth || (mes === ev.startMonth && dia >= ev.startDay);
  const antesDeFin =
    mes < ev.endMonth || (mes === ev.endMonth && dia <= ev.endDay);
  return despuesDeInicio && antesDeFin;
}

export function listarEventos(): EventoCalendario[] {
  return (Object.keys(EVENTOS) as EventoTipo[])
    .filter((k) => k !== "default")
    .map((k) => EVENTOS[k]);
}

export function obtenerEventoActivo(
  fecha: Date = new Date(),
): EventoCalendario {
  if (eventoFijadoGlobal) {
    return obtenerEventoPorTipo(eventoFijadoGlobal);
  }

  const mes = fecha.getMonth() + 1; // 1-12
  const dia = fecha.getDate();

  for (const key of Object.keys(EVENTOS) as EventoTipo[]) {
    if (key === "default") continue;
    const ev = EVENTOS[key];
    if (estaEnRango(mes, dia, ev)) return ev;
  }

  return EVENTOS.default;
}

export function obtenerEventoPorTipo(tipo: EventoTipo): EventoCalendario {
  return EVENTOS[tipo] ?? EVENTOS.default;
}

export function tiposValidos(): EventoTipo[] {
  return Object.keys(EVENTOS) as EventoTipo[];
}
