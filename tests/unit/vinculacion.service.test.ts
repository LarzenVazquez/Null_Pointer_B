import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pruebas unitarias de la lógica de vinculación del reloj (wearable.service).
 * La base de datos se reemplaza por un doble de prueba (mock de Prisma), así que
 * solo se valida la lógica de negocio: normalización del código, expiración,
 * bloqueo por intentos fallidos y emisión del token del dispositivo.
 */
const prismaMock = vi.hoisted(() => ({
  vinculacionWearable: {
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  dispWearable: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  reserva: {
    findMany: vi.fn(),
  },
}));

vi.mock("../../src/lib/prisma", () => ({ prisma: prismaMock }));
// El envío de avisos no participa en la vinculación; se aísla para no cargar Firebase.
vi.mock("../../src/services/notificaciones.service", () => ({ crearYEnviar: vi.fn() }));

import {
  autenticarDispositivo,
  confirmarVinculacion,
  consultarVinculacion,
  proximasReservas,
  solicitarVinculacion,
} from "../../src/services/wearable.service";
import { generarCodigoVinculacion, hashSecreto } from "../../src/utils/deviceToken.utils";

const minutos = (n: number) => new Date(Date.now() + n * 60_000);
let usuarioId = 100; // cada prueba usa un Usuario distinto: el contador de fallos vive en memoria

beforeEach(() => {
  vi.clearAllMocks();
  usuarioId += 1;
});

describe("generarCodigoVinculacion", () => {
  it("siempre devuelve exactamente 6 dígitos numéricos (1 000 muestras)", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generarCodigoVinculacion()).toMatch(/^\d{6}$/);
    }
  });
});

describe("solicitarVinculacion", () => {
  it("[válido] devuelve el código, el deviceCode y guarda solo el hash del deviceCode", async () => {
    prismaMock.vinculacionWearable.findFirst.mockResolvedValue(null);

    const r = await solicitarVinculacion({ nombre: "Pixel Watch", modelo: "Google Pixel Watch 3" });

    expect(r.codigo).toMatch(/^\d{6}$/);
    expect(r.intervaloSegundos).toBe(5);
    const minutosVigencia = (new Date(r.expiraEn).getTime() - Date.now()) / 60_000;
    expect(minutosVigencia).toBeGreaterThan(9.9);
    expect(minutosVigencia).toBeLessThanOrEqual(10);

    const guardado = prismaMock.vinculacionWearable.create.mock.calls[0][0].data;
    expect(guardado.deviceCodeHash).toBe(hashSecreto(r.deviceCode));
    expect(guardado.deviceCodeHash).not.toBe(r.deviceCode);
  });
});

describe("confirmarVinculacion", () => {
  it("[válido] acepta el código con espacios o guiones y lo asocia al Usuario", async () => {
    prismaMock.vinculacionWearable.findFirst.mockResolvedValue({
      id: 7, nombre: "Pixel Watch", modelo: "Google Pixel Watch 3",
    });

    const r = await confirmarVinculacion(usuarioId, " 123-456 ");

    expect(prismaMock.vinculacionWearable.findFirst.mock.calls[0][0].where.codigo).toBe("123456");
    expect(prismaMock.vinculacionWearable.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { usuarioId, confirmadaEn: expect.any(Date) },
    });
    expect(r).toEqual({ nombre: "Pixel Watch", modelo: "Google Pixel Watch 3" });
  });

  it("[inválido] rechaza un código inexistente o vencido con error 400", async () => {
    prismaMock.vinculacionWearable.findFirst.mockResolvedValue(null);

    await expect(confirmarVinculacion(usuarioId, "999999")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("no es válido o ya expiró"),
    });
    expect(prismaMock.vinculacionWearable.update).not.toHaveBeenCalled();
  });

  it("[límite] permite 10 intentos fallidos y bloquea el 11.º con error 429", async () => {
    prismaMock.vinculacionWearable.findFirst.mockResolvedValue(null);

    for (let i = 1; i <= 10; i++) {
      await expect(confirmarVinculacion(usuarioId, "000000")).rejects.toMatchObject({ statusCode: 400 });
    }
    await expect(confirmarVinculacion(usuarioId, "000000")).rejects.toMatchObject({ statusCode: 429 });
    // El bloqueo ocurre antes de consultar la base de datos.
    expect(prismaMock.vinculacionWearable.findFirst).toHaveBeenCalledTimes(10);
  });
});

describe("consultarVinculacion (lo que consulta el reloj)", () => {
  it("[límite] un código sin confirmar que vence justo ahora se reporta como expirado", async () => {
    prismaMock.vinculacionWearable.findUnique.mockResolvedValue({
      id: 1, consumida: false, usuarioId: null, usuario: null, expiraEn: new Date(),
    });
    await expect(consultarVinculacion("device-code-de-prueba-123")).resolves.toEqual({ estado: "expirado" });
  });

  it("[válido] un código sin confirmar y vigente se reporta como pendiente", async () => {
    prismaMock.vinculacionWearable.findUnique.mockResolvedValue({
      id: 1, consumida: false, usuarioId: null, usuario: null, expiraEn: minutos(5),
    });
    await expect(consultarVinculacion("device-code-de-prueba-123")).resolves.toEqual({ estado: "pendiente" });
  });

  it("[válido] al confirmarse entrega un token y solo guarda su hash", async () => {
    prismaMock.vinculacionWearable.findUnique.mockResolvedValue({
      id: 1, consumida: false, usuarioId: 4, usuario: { id: 4, nombre: "Laura Gómez" },
      nombre: "Pixel Watch", modelo: null, expiraEn: minutos(5),
    });
    prismaMock.vinculacionWearable.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.dispWearable.create.mockImplementation(async ({ data }: any) => ({
      id: 9, ...data, plataforma: "wearos", fcmToken: null, activo: true, createdAt: new Date(),
    }));

    const r: any = await consultarVinculacion("device-code-de-prueba-123");

    expect(r.estado).toBe("vinculado");
    expect(r.usuario).toEqual({ id: 4, nombre: "Laura Gómez" });
    expect(r.tokenDispositivo.length).toBeGreaterThanOrEqual(60);
    const guardado = prismaMock.dispWearable.create.mock.calls[0][0].data;
    expect(guardado.tokenHash).toBe(hashSecreto(r.tokenDispositivo));
  });

  it("[error] si dos consultas llegan a la vez, solo una crea el dispositivo (409 para la otra)", async () => {
    prismaMock.vinculacionWearable.findUnique.mockResolvedValue({
      id: 1, consumida: false, usuarioId: 4, usuario: { id: 4, nombre: "Laura Gómez" },
      nombre: "Pixel Watch", modelo: null, expiraEn: minutos(5),
    });
    prismaMock.vinculacionWearable.updateMany.mockResolvedValue({ count: 0 }); // otra consulta ya la reclamó

    await expect(consultarVinculacion("device-code-de-prueba-123")).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.dispWearable.create).not.toHaveBeenCalled();
  });
});

describe("autenticarDispositivo", () => {
  it("[inválido] un reloj dado de baja (activo = false) no se autentica", async () => {
    prismaMock.dispWearable.findUnique.mockResolvedValue({
      id: 9, usuarioId: 4, activo: false, ultimoAcceso: new Date(),
    });
    await expect(autenticarDispositivo("token-cualquiera")).resolves.toBeNull();
  });
});

describe("proximasReservas (lo que sincroniza el reloj)", () => {
  it("[límite] a las 00:30 incluye la reserva de ayer 23:00 (2 h) que sigue en curso", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:30:00-06:00"));
    try {
      prismaMock.reserva.findMany.mockResolvedValue([]);
      await proximasReservas(4);
      // La consulta debe pedir también las reservas de ayer; si solo pide desde hoy,
      // la reserva en curso nunca llega al reloj.
      const filtroFecha = prismaMock.reserva.findMany.mock.calls[0][0].where.fecha;
      expect(filtroFecha.gte).toBe("2026-10-24");
    } finally {
      vi.useRealTimers();
    }
  });
});
