import { expect, request, test } from "@playwright/test";

/**
 * E2E — Vincular un reloj desde la plataforma web y comprobar que el reloj recibe acceso a los
 * datos de la Usuaria; después desvincularlo y comprobar que lo pierde.
 *
 * El reloj se representa con un cliente HTTP que hace exactamente las mismas peticiones que la
 * app Null Pointer Wear (solicitar código → consultar estado → X-Device-Token). La interfaz del
 * reloj no se automatiza aquí (ver limitación en la documentación).
 */
const API = process.env.E2E_API_URL ?? "http://localhost:3000/api";
const USUARIA = { email: "lau_gomez88@gmail.com", password: "Laura88Go", nombre: "Laura Gómez" };
const CAPTURAS = "tests/e2e/capturas";

test("vincular y desvincular un reloj desde Mi reloj", async ({ page }) => {
  const reloj = await request.newContext({ baseURL: `${API}/` });
  const nombreReloj = `Reloj E2E ${Date.now() % 100000}`;

  // 1. El reloj abre la app y pide su código.
  const solicitud = await reloj.post("wearable/vinculacion/solicitar", { data: { nombre: nombreReloj, modelo: "Emulador" } });
  expect(solicitud.status()).toBe(201);
  const { codigo, deviceCode } = await solicitud.json();
  expect(codigo).toMatch(/^\d{6}$/);
  console.log(`Reloj "${nombreReloj}" solicitó el código ${codigo}`);

  // 2. La Usuaria inicia sesión en la web.
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(USUARIA.email);
  await page.locator('input[type="password"]').fill(USUARIA.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/usuario\//);

  // 3. Entra a Mi reloj desde el menú lateral y escribe el código.
  await page.getByRole("link", { name: /mi reloj/i }).click();
  await page.waitForURL(/mi-reloj/);
  await page.locator(".codigo-input").fill(codigo);
  await page.waitForTimeout(800); // deja terminar la animación de cambio de sección
  await page.screenshot({ path: `${CAPTURAS}/01-codigo-escrito.png` });
  await page.getByRole("button", { name: /vincular/i }).first().click();
  await expect(page.locator(".msg-ok")).toContainText(`"${nombreReloj}" terminará de vincularse`);
  await page.screenshot({ path: `${CAPTURAS}/02-codigo-confirmado.png` });

  // 4. El reloj consulta el estado y recibe su token.
  const estado = await (await reloj.post("wearable/vinculacion/estado", { data: { deviceCode } })).json();
  expect(estado.estado).toBe("vinculado");
  expect(estado.usuario.nombre).toBe(USUARIA.nombre);
  const token: string = estado.tokenDispositivo;

  // 5. Con el token, el reloj obtiene su pantalla de Inicio con los datos de la Usuaria.
  const resumen = await reloj.get("wearable/resumen", { headers: { "X-Device-Token": token } });
  expect(resumen.status()).toBe(200);
  expect((await resumen.json()).usuario.nombre).toBe(USUARIA.nombre);

  // 6. La web muestra el reloj en Mis relojes (se vuelve a entrar a la sección para recargar la lista).
  await page.getByRole("link", { name: /dashboard/i }).click();
  await page.getByRole("link", { name: /mi reloj/i }).click();
  const tarjeta = page.locator("text=" + nombreReloj).first();
  await expect(tarjeta).toBeVisible();
  await page.waitForTimeout(800); // deja terminar la animación de cambio de sección
  await page.screenshot({ path: `${CAPTURAS}/03-reloj-vinculado.png` });

  // 7. La Usuaria lo desvincula (acepta la confirmación) y el reloj pierde el acceso.
  page.once("dialog", (d) => d.accept());
  await page
    .locator("div", { has: page.locator(`text=${nombreReloj}`) })
    .getByRole("button", { name: "Desvincular" })
    .last()
    .click();
  await expect(page.locator("text=" + nombreReloj)).toHaveCount(0);
  await page.screenshot({ path: `${CAPTURAS}/04-reloj-desvinculado.png` });

  const despues = await reloj.get("wearable/resumen", { headers: { "X-Device-Token": token } });
  expect(despues.status()).toBe(401);
  console.log(`Después de desvincular, el reloj recibe ${despues.status()} en /wearable/resumen`);

  await reloj.dispose();
});
