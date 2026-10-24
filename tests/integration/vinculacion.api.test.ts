import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { hashSecreto } from "../../src/utils/deviceToken.utils";
import { prepararBase, tokenWeb } from "./datos";

/**
 * Pruebas de integración de la vinculación del reloj.
 * Componentes reales: rutas de Express → validación con Zod → middlewares de autenticación
 * (JWT y X-Device-Token) → wearable.service → Prisma → PostgreSQL de pruebas.
 * No hay mocks: cada petición pasa por toda la cadena y se revisa lo que quedó guardado.
 */
let datos: Awaited<ReturnType<typeof prepararBase>>;

beforeEach(async () => {
  datos = await prepararBase();
});

/** Lo que hace el reloj al abrir la app sin vincular. */
async function relojSolicitaCodigo() {
  const r = await request(app)
    .post("/api/wearable/vinculacion/solicitar")
    .send({ nombre: "Reloj de prueba", modelo: "Emulador Wear OS" })
    .expect(201);
  return r.body as { codigo: string; deviceCode: string; expiraEn: string };
}

describe("Vinculación reloj ↔ web ↔ backend (BD real)", () => {
  it("[flujo correcto] código → confirmación en la web → token → el reloj consulta sus datos", async () => {
    const { codigo, deviceCode } = await relojSolicitaCodigo();

    // Antes de confirmar, el reloj ve "pendiente".
    const pendiente = await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(200);
    expect(pendiente.body.estado).toBe("pendiente");

    // La Usuaria escribe el código en Mi reloj (con un espacio, como lo muestra el reloj).
    const confirmacion = await request(app)
      .post("/api/wearable/vinculacion/confirmar")
      .set("Authorization", `Bearer ${tokenWeb(datos.usuaria, "Usuario")}`)
      .send({ codigo: `${codigo.slice(0, 3)} ${codigo.slice(3)}` })
      .expect(200);
    expect(confirmacion.body.mensaje).toContain("Reloj de prueba");

    // El reloj vuelve a consultar y recibe su token.
    const vinculado = await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(200);
    expect(vinculado.body.estado).toBe("vinculado");
    expect(vinculado.body.usuario.nombre).toBe("Usuaria de Prueba");
    const token: string = vinculado.body.tokenDispositivo;

    // En la BD: el dispositivo quedó con el hash del token (no el token) y el código quedó consumido.
    const disp = await prisma.dispWearable.findFirstOrThrow({ where: { usuarioId: datos.usuaria.id } });
    expect(disp.tokenHash).toBe(hashSecreto(token));
    const vinc = await prisma.vinculacionWearable.findFirstOrThrow({ where: { codigo } });
    expect(vinc.consumida).toBe(true);

    // Con el token, el reloj obtiene su pantalla de Inicio.
    const resumen = await request(app).get("/api/wearable/resumen").set("X-Device-Token", token).expect(200);
    expect(resumen.body.usuario).toEqual({ id: datos.usuaria.id, nombre: "Usuaria de Prueba" });

    // El código ya no se puede reutilizar.
    await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(409);
  });

  it("[error] un código incorrecto, sin sesión o con un rol distinto de Usuario no vincula el reloj", async () => {
    const { codigo, deviceCode } = await relojSolicitaCodigo();
    const otroCodigo = codigo === "111111" ? "222222" : "111111";

    const incorrecto = await request(app)
      .post("/api/wearable/vinculacion/confirmar")
      .set("Authorization", `Bearer ${tokenWeb(datos.usuaria, "Usuario")}`)
      .send({ codigo: otroCodigo })
      .expect(400);
    expect(incorrecto.body.message ?? incorrecto.body.mensaje ?? JSON.stringify(incorrecto.body)).toContain("no es válido");

    await request(app).post("/api/wearable/vinculacion/confirmar").send({ codigo }).expect(401);

    await request(app)
      .post("/api/wearable/vinculacion/confirmar")
      .set("Authorization", `Bearer ${tokenWeb(datos.admin, "Administrador")}`)
      .send({ codigo })
      .expect(403);

    // Nada de lo anterior vinculó el reloj.
    const estado = await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(200);
    expect(estado.body.estado).toBe("pendiente");
    expect(await prisma.dispWearable.count()).toBe(0);
  });

  it("[error] un código vencido se reporta como expirado y ya no se puede confirmar", async () => {
    const { codigo, deviceCode } = await relojSolicitaCodigo();
    await prisma.vinculacionWearable.updateMany({ where: { codigo }, data: { expiraEn: new Date(Date.now() - 1000) } });

    const estado = await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(200);
    expect(estado.body.estado).toBe("expirado");

    await request(app)
      .post("/api/wearable/vinculacion/confirmar")
      .set("Authorization", `Bearer ${tokenWeb(datos.usuaria, "Usuario")}`)
      .send({ codigo })
      .expect(400);
  });

  it("[error] al desvincular el reloj desde la web, su token deja de funcionar (401)", async () => {
    const { codigo, deviceCode } = await relojSolicitaCodigo();
    const auth = `Bearer ${tokenWeb(datos.usuaria, "Usuario")}`;
    await request(app).post("/api/wearable/vinculacion/confirmar").set("Authorization", auth).send({ codigo }).expect(200);
    const { body } = await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(200);

    const lista = await request(app).get("/api/wearable/dispositivos").set("Authorization", auth).expect(200);
    expect(lista.body.dispositivos).toHaveLength(1);
    await request(app).delete(`/api/wearable/dispositivos/${lista.body.dispositivos[0].id}`).set("Authorization", auth).expect(200);

    await request(app).get("/api/wearable/resumen").set("X-Device-Token", body.tokenDispositivo).expect(401);
  });

  it("[límite] a las 00:30 el reloj recibe la reserva de ayer 23:00 (2 h) que sigue en curso", async () => {
    const { codigo, deviceCode } = await relojSolicitaCodigo();
    await request(app)
      .post("/api/wearable/vinculacion/confirmar")
      .set("Authorization", `Bearer ${tokenWeb(datos.usuaria, "Usuario")}`)
      .send({ codigo })
      .expect(200);
    const { body } = await request(app).post("/api/wearable/vinculacion/estado").send({ deviceCode }).expect(200);

    await prisma.reserva.create({
      data: {
        usuarioId: datos.usuaria.id, salaId: "A", fecha: "2026-10-24", hora: "23:00", duracionHoras: 2,
        precioSala: 300, servicios: [], precioServicios: 0, precioTotal: 300, estado: "confirmada",
      },
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:30:00-06:00"));
    try {
      const r = await request(app).get("/api/wearable/reservas/proximas").set("X-Device-Token", body.tokenDispositivo).expect(200);
      expect(r.body.reservas.map((x: { hora: string }) => x.hora)).toEqual(["23:00"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
