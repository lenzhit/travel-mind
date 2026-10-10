import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, conn } from "@/server/db";
import * as tables from "@/server/db/schema";
import { createVisitor } from "@/server/services/visitor-session";
import { authenticateCustomer, requireCustomer } from "@/server/services/customer-auth";
import { quotationService } from "@/server/services/quotation.service";
import { bookingService } from "@/server/services/booking.service";
import { readOperationalMetrics } from "@/server/services/operational-metrics";
import { PaymentService } from "@/server/services/payment.service";
import { MockPaymentProvider } from "@/server/providers/mock-payment-provider";
import { MockTravelProvider } from "@/server/providers/mock-travel-provider";
import { BookerAgent } from "@/server/ai/booker";
import { NextRequest } from "next/server";
import { POST as reserveRoute } from "@/app/api/reserve/route";
import { GET as reservationRoute } from "@/app/api/reservations/[id]/route";
import { POST as workflowRoute } from "@/app/api/internal/workflows/process/route";
import { GET as approvalsRoute } from "@/app/api/admin/approvals/route";
import { processOutbox } from "@/server/workflows/outbox";
import { DELETE as signOutRoute } from "@/app/api/customer/session/route";
const packageId = randomUUID(), destinationId = randomUUID();
let visitor: Awaited<ReturnType<typeof createVisitor>>;
let customerId: string;
let customerToken: string;
const provider = new MockPaymentProvider();
const service = new PaymentService(provider);
let dateSequence = 10;
async function quote(price = 100000, travelers = 2, date?: string) {
  await db.update(tables.packages).set({ basePriceMinor: price }).where(eq(tables.packages.id, packageId));
  const id = await quotationService.issue(visitor.id, { packageId, travelers, departureDate: date ?? `2027-02-${dateSequence++}` }, randomUUID(), randomUUID());
  return quotationService.get(visitor.id, id);
}
async function reserve(q: Awaited<ReturnType<typeof quote>>, key = randomUUID()) {
  return bookingService.reserve(customerId, { quotationId: q.id, acceptedVersion: q.version, acceptedTotalMinor: q.totalMinor, termsAccepted: true, travelerName: "Responsable fixture" }, key, randomUUID());
}
beforeAll(async () => {
  if (!process.env.DATABASE_URL?.endsWith("/travelmind_admin_test")) throw new Error("Test database required");
  await db.insert(tables.destinations).values({ id: destinationId, name: "Destino reserva fixture", slug: `reservation-${destinationId}`, region: "Fixture", description: "Fixture", imageUrl: "/fixture.svg" });
  await db.insert(tables.packages).values({ id: packageId, destinationId, title: "Reserva fixture", slug: `reservation-${packageId}`, description: "Contenido aprobado fixture", durationDays: 2, category: "cultural", basePriceMinor: 100000 });
  await db.insert(tables.packageVariants).values({ packageId, name: "Grupo fixture", priceMinor: 100000, capacity: 2 });
  visitor = await createVisitor();
  const auth = await authenticateCustomer({ action: "register", username: `fixture_${randomUUID().slice(0, 8)}`, password: "fixture-password-local" }, visitor.id);
  customerId = auth.customer.id;
  customerToken = auth.token;
});
afterAll(async () => {
  const ids = (await db.select({ id: tables.reservations.id }).from(tables.reservations).where(eq(tables.reservations.customerId, customerId))).map(row => row.id);
  if (ids.length) {
    const approvals = (await db.select().from(tables.approvalRequests).where(inArray(tables.approvalRequests.reservationId, ids))).map(row => row.id);
    const payments = (await db.select().from(tables.payments).where(inArray(tables.payments.reservationId, ids))).map(row => row.id);
    if (approvals.length) await db.delete(tables.approvalDecisions).where(inArray(tables.approvalDecisions.approvalId, approvals));
    if (payments.length) await db.delete(tables.paymentEvents).where(inArray(tables.paymentEvents.paymentId, payments));
    for (const table of [tables.notificationDeliveries, tables.workflowOutbox, tables.reservationEvents, tables.approvalRequests, tables.payments, tables.providerBookingAttempts, tables.reservationConsents]) await db.delete(table).where(inArray(table.reservationId, ids));
    await db.delete(tables.reservations).where(inArray(tables.reservations.id, ids));
  }
  const quotes = (await db.select().from(tables.quotations).where(eq(tables.quotations.sessionId, visitor.id))).map(row => row.id);
  if (quotes.length) await db.delete(tables.quotationVersions).where(inArray(tables.quotationVersions.quotationId, quotes));
  await db.delete(tables.quotations).where(eq(tables.quotations.sessionId, visitor.id));
  await db.delete(tables.customerSessions).where(eq(tables.customerSessions.customerId, customerId));
  await db.delete(tables.visitorSessions).where(eq(tables.visitorSessions.id, visitor.id));
  await db.delete(tables.customers).where(eq(tables.customers.id, customerId));
  await db.delete(tables.mockInventory).where(eq(tables.mockInventory.packageId, packageId));
  await db.transaction(async tx => {
    await tx.select().from(tables.packages).where(eq(tables.packages.id, packageId)).for("update");
    await tx.delete(tables.catalogDocuments).where(eq(tables.catalogDocuments.packageId, packageId));
    await tx.delete(tables.packages).where(eq(tables.packages.id, packageId));
  });
  await db.delete(tables.destinations).where(eq(tables.destinations.id, destinationId));
  await conn.end();
});
describe("Reservas y pagos locales verificables", () => {
  it("API aplica cookies, mismo origen, esquema estricto y roles de servidor", async () => {
    const body = { quotationId: randomUUID(), acceptedVersion: 1, acceptedTotalMinor: 1, termsAccepted: true, travelerName: "Fixture responsable" };
    const request = (payload: unknown, origin: string, authenticated: boolean) => new NextRequest("http://localhost:3000/api/reserve", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": randomUUID(), ...(authenticated ? { Cookie: `travelmind_customer=${customerToken}; travelmind_visitor=${visitor.token}` } : {}) }, body: JSON.stringify(payload) });
    expect((await reserveRoute(request(body, "http://localhost:3000", false))).status).toBe(401);
    expect((await reserveRoute(request(body, "https://other.test", true))).status).toBe(403);
    expect((await reserveRoute(request({ ...body, customerId }, "http://localhost:3000", true))).status).toBe(400);
    const get = new NextRequest("http://localhost:3000/api/reservations", { headers: { Cookie: `travelmind_customer=${customerToken}; travelmind_visitor=${visitor.token}` } });
    expect((await reservationRoute(get, { params: Promise.resolve({ id: randomUUID() }) })).status).toBe(404);
    expect((await approvalsRoute(get)).status).toBe(403);
    expect((await workflowRoute(new NextRequest("http://localhost:3000/api/internal/workflows/process", { method: "POST" }))).status).toBe(401);
  });
  it("USD 2000 exactos no requieren aprobación; solicitudes concurrentes son idempotentes", async () => {
    const q = await quote(); const key = randomUUID();
    const [a, b] = await Promise.all([reserve(q, key), reserve(q, key)]);
    expect(a).toBe(b); expect((await bookingService.get(customerId, a)).status).toBe("pending_payment");
    await expect(bookingService.get(randomUUID(), a)).rejects.toMatchObject({ status: 404 });
    await expect(reserve(q)).rejects.toMatchObject({ status: 409 });
    const checkout = await bookingService.checkout(customerId, a, key);
    expect((await bookingService.checkout(customerId, a, key)).id).toBe(checkout.id);
    await expect(bookingService.checkout(customerId, a, randomUUID())).rejects.toMatchObject({ status: 409 });
    const sealed = provider.emit(checkout, "succeeded");
    await Promise.all([service.applyEvent(sealed.event, sealed.signature), service.applyEvent(sealed.event, sealed.signature)]);
    expect(await bookingService.get(customerId, a)).toMatchObject({ status: "confirmed_demo", providerReference: `MOCK-${a}` });
    expect((await bookingService.get(customerId, a)).timeline.map(row => row.event)).toEqual(["reservation_requested", "payment_processing", "pending_provider", "confirmed_demo"]);
    expect((await db.select().from(tables.mockInventory).where(eq(tables.mockInventory.departureDate, q.departureDate)))[0].remaining).toBe(0);
    expect(await db.select().from(tables.providerBookingAttempts).where(eq(tables.providerBookingAttempts.reservationId, a))).toHaveLength(1);
  });
  it("totales mayores necesitan HITL y una decisión antes del checkout", async () => {
    const q = await quote(100001); const id = await reserve(q);
    const state = await bookingService.get(customerId, id);
    expect(state.status).toBe("pending_approval");
    await expect(bookingService.checkout(customerId, id, randomUUID())).rejects.toMatchObject({ status: 409 });
    await bookingService.decide(state.approval!.id, "fixture-admin", { decision: "approved", reason: "Tarifa y condiciones verificadas" });
    expect((await bookingService.get(customerId, id)).status).toBe("pending_payment");
  });
  it("cambio de tarifa exige renovar consentimiento y cruzar el umbral exige HITL", async () => {
    const q = await quote(); const id = await reserve(q);
    await db.update(tables.packages).set({ basePriceMinor: 100001 }).where(eq(tables.packages.id, packageId));
    await expect(bookingService.checkout(customerId, id, randomUUID())).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    const updated = await bookingService.revalidate(customerId, q.id);
    expect(updated).toMatchObject({ version: 2, totalMinor: 200002 });
    await bookingService.accept(customerId, id, { acceptedVersion: updated.version, acceptedTotalMinor: updated.totalMinor, termsAccepted: true });
    expect((await bookingService.get(customerId, id)).status).toBe("pending_approval");
    expect(await db.select().from(tables.reservationConsents).where(eq(tables.reservationConsents.reservationId, id))).toHaveLength(2);
  });
  it("cotización vencida y aprobación rechazada no permiten pagar", async () => {
    const q = await quote();
    await expect(bookingService.reserve(customerId, { quotationId: q.id, acceptedVersion: q.version, acceptedTotalMinor: q.totalMinor, termsAccepted: true, travelerName: "Responsable fixture" }, randomUUID(), randomUUID(), new Date(q.expiresAt))).rejects.toMatchObject({ status: 422 });
    const high = await quote(100001); const id = await reserve(high); const state = await bookingService.get(customerId, id);
    await bookingService.decide(state.approval!.id, "fixture-admin", { decision: "rejected", reason: "No se autoriza esta operación" });
    await expect(bookingService.checkout(customerId, id, randomUUID())).rejects.toMatchObject({ status: 409 });
  });
  it("pago verificado con fallo del proveedor conserva la reversión pendiente", async () => {
    const id = await reserve(await quote()); const checkout = await bookingService.checkout(customerId, id, randomUUID());
    const failing = new PaymentService(provider, new MockTravelProvider(true));
    await failing.simulate(customerId, checkout.id, "succeeded");
    expect(await bookingService.get(customerId, id)).toMatchObject({ status: "refund_pending", providerReference: null });
    await failing.reconcileRefund(customerId, id); await failing.reconcileRefund(customerId, id);
    expect((await bookingService.get(customerId, id)).status).toBe("refunded");
    expect(await db.select().from(tables.paymentEvents).where(eq(tables.paymentEvents.id, `refunded-${checkout.id}`))).toHaveLength(1);
  });
  it("el vencimiento exacto de HITL cierra la solicitud sin habilitar pago", async () => {
    const id = await reserve(await quote(100001)); const state = await bookingService.get(customerId, id);
    const expired = await bookingService.get(customerId, id, new Date(state.approval!.expiresAt));
    expect(expired).toMatchObject({ status: "expired", approval: { status: "expired" } });
    await expect(bookingService.checkout(customerId, id, randomUUID())).rejects.toMatchObject({ status: 409 });
  });
  it("fallo y cancelación permiten reintentos acotados sin confirmar ni pagar automáticamente", async () => {
    const id = await reserve(await quote());
    for (const outcome of ["failed", "cancelled", "failed"] as const) {
      const checkout = await bookingService.checkout(customerId, id, randomUUID());
      await service.simulate(customerId, checkout.id, outcome);
      expect((await bookingService.get(customerId, id)).status).toBe("pending_payment");
    }
    await expect(bookingService.checkout(customerId, id, randomUUID())).rejects.toMatchObject({ status: 429 });
    expect(await db.select().from(tables.providerBookingAttempts).where(eq(tables.providerBookingAttempts.reservationId, id))).toHaveLength(0);
  });
  it("últimos cupos concurrentes no se duplican ni producen stock negativo", async () => {
    const date = "2027-04-20"; const a = await reserve(await quote(100000, 2, date)); const b = await reserve(await quote(100000, 2, date));
    const first = await bookingService.checkout(customerId, a, randomUUID()); const second = await bookingService.checkout(customerId, b, randomUUID());
    await Promise.all([service.simulate(customerId, first.id, "succeeded"), service.simulate(customerId, second.id, "succeeded")]);
    expect([(await bookingService.get(customerId, a)).status, (await bookingService.get(customerId, b)).status].sort()).toEqual(["confirmed_demo", "refund_pending"]);
  });
  it("eventos manipulados se rechazan; discrepancia firmada se escala sin confirmar", async () => {
    const id = await reserve(await quote()); const checkout = await bookingService.checkout(customerId, id, randomUUID());
    const sealed = provider.emit(checkout, "succeeded");
    await expect(service.applyEvent({ ...sealed.event, totalMinor: 1 }, sealed.signature)).rejects.toBeDefined();
    const mismatch = provider.emit({ ...checkout, totalMinor: 1 }, "succeeded");
    expect((await service.applyEvent(mismatch.event, mismatch.signature)).accepted).toBe(false);
    expect((await bookingService.get(customerId, id)).status).toBe("manual_review");
    await expect(bookingService.accept(customerId, id, { acceptedVersion: 1, acceptedTotalMinor: checkout.totalMinor, termsAccepted: true })).rejects.toMatchObject({ code: "MANUAL_REVIEW" });
    await expect(service.simulate(randomUUID(), checkout.id, "succeeded")).rejects.toMatchObject({ status: 404 });
  });
  it("BookerAgent rechaza tools no autorizadas y objetos ajenos", async () => {
    const agent = new BookerAgent(customerId);
    await expect(agent.execute("execute_sql", { sql: "delete" })).rejects.toMatchObject({ status: 403 });
    await expect(agent.execute("get_booking_status", { reservationId: randomUUID() })).rejects.toMatchObject({ status: 404 });
  });
  it("fallo de correo conserva la reserva y entrega WhatsApp local una sola vez", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline fixture")));
    try {
      await processOutbox();
      const own = (await db.select().from(tables.reservations).where(eq(tables.reservations.customerId, customerId))).map(row => row.id);
      const deliveries = await db.select().from(tables.notificationDeliveries).where(inArray(tables.notificationDeliveries.reservationId, own));
      expect(deliveries.some(row => row.channel === "email" && row.status === "failed")).toBe(true);
      expect(deliveries.filter(row => row.channel === "whatsapp").every(row => row.status === "sent_demo" && row.attempts === 1)).toBe(true);
      await db.update(tables.notificationDeliveries).set({ nextAttemptAt: new Date(0) }).where(inArray(tables.notificationDeliveries.reservationId, own));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ID: "fixture-mailpit-id" }))));
      await processOutbox();
      const emails = await db.select().from(tables.notificationDeliveries).where(eq(tables.notificationDeliveries.providerReference, "fixture-mailpit-id"));
      expect(emails.length).toBeGreaterThan(0);
      expect((await db.select().from(tables.reservations).where(eq(tables.reservations.customerId, customerId))).some(row => row.status === "confirmed_demo")).toBe(true);
    } finally { vi.unstubAllGlobals(); }
  });
  it("métricas cuentan reservas únicas y detectan conciliación, vencimientos y entregas agotadas", async () => {
    const before = await readOperationalMetrics();
    const q = await quote(120000, 2);
    const row = await reserve(q);
    // Fixtures de incidencias; ningún evento de pago se ejecuta.
    const old = new Date(Date.now() - 600000);
    await db.update(tables.reservations).set({ status: "pending_provider", updatedAt: old }).where(eq(tables.reservations.id, row));
    await db.update(tables.approvalRequests).set({ expiresAt: new Date(0) }).where(eq(tables.approvalRequests.reservationId, row));
    await db.insert(tables.payments).values([1, 2].map(() => ({ reservationId: row, quoteVersion: q.version, totalMinor: q.totalMinor, status: "succeeded", idempotencyKey: randomUUID() })));
    const [event] = await db.select().from(tables.reservationEvents).where(eq(tables.reservationEvents.reservationId, row));
    await db.insert(tables.notificationDeliveries).values({ reservationId: row, eventId: event.id, channel: "email", status: "failed", attempts: 3, body: "Texto privado de fixture que no debe aparecer en métricas" });
    await db.update(tables.workflowOutbox).set({ createdAt: old }).where(eq(tables.workflowOutbox.reservationId, row));
    const snapshot = await readOperationalMetrics();
    expect(snapshot.totals.reservations).toBe(before.totals.reservations + 1);
    expect(snapshot.states.reduce((sum, group) => sum + group.count, 0)).toBe(snapshot.totals.reservations);
    expect(snapshot.alerts.unreconciledPayments).toBe(before.alerts.unreconciledPayments + 1);
    expect(snapshot.alerts.overdueApprovals).toBe(before.alerts.overdueApprovals + 1);
    expect(snapshot.alerts.exhaustedNotifications).toBe(before.alerts.exhaustedNotifications + 1);
    expect(snapshot.alerts.delayedWorkflows).toBeGreaterThan(before.alerts.delayedWorkflows);
    expect(JSON.stringify(snapshot)).not.toContain("Texto privado"); expect(JSON.stringify(snapshot)).not.toContain("Responsable fixture");
    await db.update(tables.reservations).set({ updatedAt: new Date() }).where(eq(tables.reservations.id, row));
    expect((await readOperationalMetrics()).alerts.unreconciledPayments).toBe(before.alerts.unreconciledPayments);
  });
  it("cerrar sesión revoca el token de cliente y retira ambas cookies", async () => {
    const response = await signOutRoute(new NextRequest("http://localhost:3000/api/customer/session", { method: "DELETE", headers: { Origin: "http://localhost:3000", Cookie: `travelmind_customer=${customerToken}; travelmind_visitor=${visitor.token}` } }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("travelmind_customer")?.value).toBe("");
    expect(response.cookies.get("travelmind_visitor")?.value).toBe("");
    await expect(requireCustomer(customerToken)).rejects.toMatchObject({ status: 401 });
  });
});



