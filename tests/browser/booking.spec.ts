import "./environment";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, conn } from "./db";
import { customers, paymentEvents, payments, quotations, reservations } from "../../src/server/db/schema";
import { TEST_ORIGIN } from "./environment";
const password = "fixture-browser-local";
test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => new URL(route.request().url()).origin === TEST_ORIGIN ? route.continue() : route.abort());
});
test.afterAll(async () => { await conn.end(); });
async function register(page: Page) {
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  await page.goto("/account");
  await page.getByRole("button", { name: "Crear una cuenta", exact: true }).click();
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Crear mi cuenta", exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/reservations$/);
  return username;
}
async function recommendAndQuote(page: Page, travelers = 1) {
  await page.goto("/chat");
  await page.getByLabel("¿Qué te gustaría conocer?", { exact: true }).fill("Viaje cultural en Perú");
  await page.getByLabel("Viajeros", { exact: true }).fill(String(travelers));
  await page.getByLabel("Presupuesto total (USD), opcional").fill(String(1900 * travelers));
  await page.getByLabel("Fecha de salida, opcional").fill("2027-06-18");
  const chatResponse = page.waitForResponse(response => response.url().endsWith("/api/chat") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Encontrar mi viaje", exact: true }).press("Enter");
  const result = await (await chatResponse).json();
  expect(result.data.mode).toBe("deterministic"); expect(result.data.recommendations.length).toBeGreaterThan(0);
  expect(result.data.recommendations[0].sources.length).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Opciones para tu viaje" })).toBeVisible();
  await page.getByRole("button", { name: "Solicitar cotización", exact: true }).first().press("Enter");
  await expect(page).toHaveURL(/\/quotes\/[a-f0-9-]+$/);
  return page.url().split("/").at(-1)!;
}
async function reserve(page: Page) {
  await page.getByRole("button", { name: "Revisar disponibilidad y precio", exact: true }).press("Enter");
  await page.getByLabel("Nombre del responsable").fill("Responsable ficticio E2E");
  await page.getByRole("checkbox", { name: "Acepto este total y las condiciones de la solicitud." }).check();
  await page.getByRole("button", { name: "Aceptar y solicitar reserva", exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/reservations\/[a-f0-9-]+$/);
  return page.url().split("/").at(-1)!;
}
test("recorrido con fallback, cotización, consentimiento y confirmación simulada", async ({ page }, testInfo) => {
  await register(page); const quoteId = await recommendAndQuote(page); const id = await reserve(page);
  await expect(page.getByRole("status").filter({ hasText: "Listo para pagar" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar al pago de prueba", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Autorizar pago de prueba", exact: true }).press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Confirmación de prueba" })).toBeVisible();
  await expect(page.getByText("SIMULACIÓN / NO SE REALIZÓ NINGÚN CARGO NI RESERVA EXTERNA", { exact: true })).toBeVisible();
  const [persisted] = await db.select().from(reservations).where(eq(reservations.id, id));
  expect(persisted.quotationId).toBe(quoteId); expect(persisted.providerReference).toBe(`MOCK-${id}`);
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("confirmacion-movil.png"), fullPage: true });
});
test("cotización vencida impide solicitar reserva en la interfaz", async ({ page }) => {
  await register(page); const quoteId = await recommendAndQuote(page);
  const issuedAt = new Date(Date.now() - 48 * 3600000);
  await db.update(quotations).set({ issuedAt, expiresAt: new Date(issuedAt.getTime() + 24 * 3600000) }).where(eq(quotations.id, quoteId));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Actualiza tu cotización" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revisar disponibilidad y precio" })).toHaveCount(0);
  expect(await db.select().from(reservations).where(eq(reservations.quotationId, quoteId))).toHaveLength(0);
});
test("cuenta aplica roles, asignación y cierre seguro de incidencias", async ({ page, context, browser }) => {
  const username = await register(page);
  await page.goto("/account"); await expect(page.getByText(username, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Gestionar paquetes" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Resumen operativo" })).toHaveCount(0);
  const denied = await context.request.get("/api/admin/metrics"); expect(denied.status()).toBe(403);
  await page.goto("/account/operations"); await expect(page).toHaveURL(/\/account$/);
  expect((await context.request.get("/api/admin/cases")).status()).toBe(403);
  await page.goto("/account/cases"); await expect(page).toHaveURL(/\/account$/);
  await recommendAndQuote(page); const caseId = await reserve(page);
  await db.update(reservations).set({ status: "manual_review", reason: "price_changed" }).where(eq(reservations.id, caseId));
  // El rol se asigna por fixture de servidor, nunca por el navegador.
  await db.update(customers).set({ role: "admin" }).where(eq(customers.username, username));
  await page.goto("/account");
  await page.getByRole("link", { name: "Resumen operativo", exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: "Resumen operativo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actualizar resumen", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Actualizar resumen", exact: true }).press("Enter");
  await expect(page.getByText(/Última actualización:/)).toBeVisible();
  await page.getByRole("link", { name: "Incidencias de reservas", exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: "Incidencias de reservas", exact: true })).toBeVisible();
  await expect(page.getByText(`Solicitud: ${caseId}`, { exact: true })).toBeVisible();
  await expect(page.getByText(/Cambió la tarifa/)).toBeVisible();
  expect((await context.request.get("/api/admin/cases?page=0")).status()).toBe(400);
  const agentContext = await browser.newContext({ baseURL: TEST_ORIGIN });
  try {
    await agentContext.route("**/*", route => new URL(route.request().url()).origin === TEST_ORIGIN ? route.continue() : route.abort());
    const agentPage = await agentContext.newPage(); const agentName = await register(agentPage);
    await db.update(customers).set({ role: "travel_agent" }).where(eq(customers.username, agentName));
    expect((await agentContext.request.get("/api/admin/cases")).status()).toBe(200);
    expect((await (await agentContext.request.get("/api/admin/cases")).json()).data.items).toHaveLength(0);
    await page.setViewportSize({ width: 320, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByLabel("Acción", { exact: true }).selectOption("assign");
    await page.getByLabel("Usuario del agente", { exact: true }).fill(agentName);
    await page.getByLabel("Motivo o nota", { exact: true }).fill("Asignación al agente ficticio de navegador");
    await page.getByRole("button", { name: "Guardar decisión", exact: true }).press("Enter");
    await expect(page.getByText(`Asignado a: ${agentName}`, { exact: true })).toBeVisible();
    await agentPage.goto("/account");
    await agentPage.getByRole("link", { name: "Incidencias de reservas", exact: true }).press("Enter");
    await expect(agentPage.getByText(`Solicitud: ${caseId}`, { exact: true })).toBeVisible();
    await expect(agentPage.getByRole("option", { name: "Asignar a un agente" })).toHaveCount(0);
    await agentPage.getByLabel("Motivo o nota", { exact: true }).fill("Nota registrada por el agente asignado");
    await agentPage.getByRole("button", { name: "Guardar decisión", exact: true }).press("Enter");
    await expect(agentPage.getByText("Decisión registrada. Se actualizó la cola.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Actualizar incidencias", exact: true }).press("Enter");
    await expect(page.getByText(`Solicitud: ${caseId}`, { exact: true })).toBeVisible();
  } finally { await agentContext.close(); }
  await page.getByLabel("Motivo o nota", { exact: true }).fill("Tarifa revisada en atención ficticia de navegador");
  await page.getByRole("button", { name: "Guardar decisión", exact: true }).press("Enter");
  await expect(page.getByText("Decisión registrada. Se actualizó la cola.", { exact: true })).toBeVisible();
  await page.getByLabel("Acción", { exact: true }).selectOption("close_unpaid");
  await page.getByLabel("Motivo o nota", { exact: true }).fill("Cierre ficticio de revisión sin pago autorizado");
  await expect(page.getByRole("button", { name: "Guardar decisión", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Confirmo el cierre/ }).check();
  await page.getByRole("button", { name: "Guardar decisión", exact: true }).press("Enter");
  await expect(page.getByText("No hay incidencias en esta página.")).toBeVisible();
  expect((await db.select().from(reservations).where(eq(reservations.id, caseId)))[0].status).toBe("cancelled");
  await page.getByRole("button", { name: "Actualizar incidencias", exact: true }).press("Enter");
  await expect(page.getByText("Página 1", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});


test("rechazo humano bloquea el pago y una cuenta ajena no lee la solicitud", async ({ page, browser }) => {
  await register(page); await recommendAndQuote(page, 10); const id = await reserve(page);
  await expect(page.getByRole("status").filter({ hasText: "Pendiente de aprobación" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar al pago de prueba" })).toHaveCount(0);
  const staffContext = await browser.newContext({ baseURL: TEST_ORIGIN });
  try {
    await staffContext.route("**/*", route => new URL(route.request().url()).origin === TEST_ORIGIN ? route.continue() : route.abort());
    const staff = await staffContext.newPage(); const username = await register(staff);
    const denied = await staffContext.request.get(`/api/reservations/${id}`);
    expect(denied.status()).toBe(404);
    await db.update(customers).set({ role: "approver" }).where(eq(customers.username, username));
    expect((await staffContext.request.get("/api/admin/cases")).status()).toBe(403);
    await staff.goto("/account/approvals");
    await staff.getByLabel("Motivo de la decisión").fill("Solicitud ficticia rechazada para comprobar bloqueo");
    await staff.getByRole("button", { name: "Rechazar", exact: true }).press("Enter");
    await expect.poll(async () => (await db.select({ status: reservations.status }).from(reservations).where(eq(reservations.id, id)))[0].status).toBe("rejected");
    await page.reload(); await expect(page.getByRole("status").filter({ hasText: "Solicitud rechazada" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar al pago de prueba" })).toHaveCount(0);
  } finally { await staffContext.close(); }
});

test("personal cancela desde su cuenta un pago demo con importe no verificado", async ({ page }) => {
  const username = await register(page); await recommendAndQuote(page); const id = await reserve(page);
  await page.getByRole("button", { name: "Continuar al pago de prueba", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Autorizar pago de prueba", exact: true })).toBeVisible();
  const [payment] = await db.select().from(payments).where(eq(payments.reservationId, id));
  expect(payment.status).toBe("pending");
  // La firma y el escalamiento de la discrepancia se prueban en integración.
  await db.update(reservations).set({ status: "manual_review", reason: "payment_amount_mismatch" }).where(eq(reservations.id, id));
  await db.update(customers).set({ role: "admin" }).where(eq(customers.username, username));
  await page.goto("/account/cases");
  await expect(page.getByText(`Solicitud: ${id}`, { exact: true })).toBeVisible();
  await page.getByLabel("Acción", { exact: true }).selectOption("cancel_unverified");
  await page.getByLabel("Motivo o nota", { exact: true }).fill("Importe discrepante sin evento de pago verificado");
  await expect(page.getByRole("button", { name: "Guardar decisión", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: /no hay evidencia de pago verificado/ }).check();
  await page.getByRole("button", { name: "Guardar decisión", exact: true }).press("Enter");
  await expect(page.getByText("No hay incidencias en esta página.")).toBeVisible();
  expect((await db.select().from(payments).where(eq(payments.id, payment.id)))[0].status).toBe("cancelled");
  expect((await db.select().from(reservations).where(eq(reservations.id, id)))[0].status).toBe("cancelled");
});

test("personal solicita reversión simulada si el proveedor no confirma", async ({ page }) => {
  const username = await register(page); await recommendAndQuote(page); const id = await reserve(page);
  await page.getByRole("button", { name: "Continuar al pago de prueba", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Autorizar pago de prueba", exact: true })).toBeVisible();
  const [payment] = await db.select().from(payments).where(eq(payments.reservationId, id));
  await db.update(payments).set({ status: "succeeded" }).where(eq(payments.id, payment.id));
  await db.insert(paymentEvents).values({ id: `verified-browser-${payment.id}`, paymentId: payment.id, type: "succeeded" });
  await db.update(reservations).set({ status: "pending_provider", updatedAt: new Date(Date.now() - 6 * 60000) }).where(eq(reservations.id, id));
  await db.update(customers).set({ role: "admin" }).where(eq(customers.username, username));
  await page.goto("/account/cases");
  await expect(page.getByText(`Solicitud: ${id}`, { exact: true })).toBeVisible();
  await page.getByLabel("Acción", { exact: true }).selectOption("request_mock_refund");
  await page.getByLabel("Motivo o nota", { exact: true }).fill("No consta prueba de reserva del proveedor simulado");
  await expect(page.getByRole("button", { name: "Guardar decisión", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: /no existe prueba de reserva/ }).check();
  await page.getByRole("button", { name: "Guardar decisión", exact: true }).press("Enter");
  await expect(page.getByText("Decisión registrada. Se actualizó la cola.")).toBeVisible();
  expect((await db.select().from(reservations).where(eq(reservations.id, id)))[0].status).toBe("refund_pending");
  expect((await db.select().from(payments).where(eq(payments.id, payment.id)))[0].refundStatus).toBe("pending");
});
