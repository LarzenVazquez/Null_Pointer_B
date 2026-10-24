import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { fechaLocal, inicioDeReserva } from "../utils/fechas.utils";
import { notificarRecordatorio } from "../services/notificaciones.service";

let temporizador: NodeJS.Timeout | null = null;
let ejecutando = false;

export async function completarReservasTerminadas(
  ahora: Date = new Date(),
): Promise<number> {
  const candidatas = await prisma.reserva.findMany({
    where: { estado: "confirmada", fecha: { lte: fechaLocal(ahora) } },
    select: { id: true, fecha: true, hora: true, duracionHoras: true },
  });

  const terminadas = candidatas
    .filter(
      (r) =>
        inicioDeReserva(r.fecha, r.hora).getTime() +
          r.duracionHoras * 3_600_000 <=
        ahora.getTime(),
    )
    .map((r) => r.id);
  if (!terminadas.length) return 0;

  const { count } = await prisma.reserva.updateMany({
    where: { id: { in: terminadas }, estado: "confirmada" },
    data: { estado: "completada" },
  });
  if (count)
    console.log(
      `[reservas] ${count} reserva(s) marcada(s) como completada(s).`,
    );
  return count;
}

export async function revisarRecordatorios(
  ahora: Date = new Date(),
): Promise<number> {
  if (ejecutando) return 0;
  ejecutando = true;
  try {
    await completarReservasTerminadas(ahora);

    const limite = new Date(
      ahora.getTime() + env.RECORDATORIO_MINUTOS_ANTES * 60_000,
    );
    const fechas = Array.from(new Set([fechaLocal(ahora), fechaLocal(limite)]));

    const candidatas = await prisma.reserva.findMany({
      where: {
        estado: "confirmada",
        recordatorioEnviado: false,
        fecha: { in: fechas },
      },
      include: { sala: { select: { nombre: true } } },
    });

    let enviados = 0;
    for (const r of candidatas) {
      const inicio = inicioDeReserva(r.fecha, r.hora);
      if (inicio <= ahora || inicio > limite) continue;

      const reclamo = await prisma.reserva.updateMany({
        where: { id: r.id, recordatorioEnviado: false },
        data: { recordatorioEnviado: true },
      });
      if (reclamo.count === 0) continue;

      const minutos = Math.round((inicio.getTime() - ahora.getTime()) / 60_000);
      await notificarRecordatorio(
        {
          id: r.id,
          usuarioId: r.usuarioId,
          salaId: r.salaId,
          salaNombre: r.sala?.nombre ?? r.salaId,
          fecha: r.fecha,
          hora: r.hora,
          duracionHoras: r.duracionHoras,
        },
        minutos,
      );
      enviados++;
    }
    if (enviados)
      console.log(`[recordatorios] ${enviados} recordatorio(s) enviado(s).`);
    return enviados;
  } catch (err) {
    console.error("[recordatorios] Error al revisar reservas:", err);
    return 0;
  } finally {
    ejecutando = false;
  }
}

export function iniciarRecordatorios(): void {
  if (temporizador) return;
  const ms = Math.max(5, env.RECORDATORIO_INTERVALO_SEGUNDOS) * 1000;
  temporizador = setInterval(() => void revisarRecordatorios(), ms);
  void revisarRecordatorios();
  console.log(
    `[recordatorios] Activo: revisa cada ${ms / 1000}s, avisa ${env.RECORDATORIO_MINUTOS_ANTES} min antes.`,
  );
}

export function detenerRecordatorios(): void {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}
