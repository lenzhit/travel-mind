import { POST as caseActionRoute } from "@/app/api/admin/cases/[id]/route";
import { actOnCase } from "@/server/services/case-actions";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, conn } from "@/server/db";
import * as tables from "@/server/db/schema";
import { createVisitor } from "@/server/services/visitor-session";
import { authenticateCustomer, requireCustomer } from "@/server/services/customer-auth";
import { quotationService } from "@/server/services/quotation.service";
import { bookingService } from "@/server/services/booking.service";
import { applyRetention } from "@/server/workflows/retention";
import { readOperationCases } from "@/server/services/operation-cases";
import { GET as casesRoute } from "@/app/api/admin/cases/route";
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
import { listExhaustedNotifications, retryExhaustedNotification } from "@/server/services/notification-retries";
import { GET as exhaustedRoute } from "@/app/api/admin/notifications/route";
import { POST as retryRoute } from "@/app/api/admin/notifications/[id]/retry/route";
import { DELETE as signOutRoute } from "@/app/api/customer/session/route";
const packageId = randomUUID(), destinationId = randomUUID();
const staffIds: string[] = [];
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
    const deliveryIds = (await db.select({ id: tables.notificationDeliveries.id }).from(tables.notificationDeliveries).where(inArray(tables.notificationDeliveries.reservationId, ids))).map(row => row.id);
    if (deliveryIds.length) await db.delete(tables.notificationRetryActions).where(inArray(tables.notificationRetryActions.deliveryId, deliveryIds));
    for (const table of [tables.caseActions, tables.notificationDeliveries, tables.workflowOutbox, tables.reservationEvents, tables.approvalRequests, tables.payments, tables.providerBookingAttempts, tables.reservationConsents]) await db.delete(table).where(inArray(table.reservationId, ids));
    await db.delete(tables.reservations).where(inArray(tables.reservations.id, ids));
  }
  const quotes = (await db.select().from(tables.quotations).where(eq(tables.quotations.sessionId, visitor.id))).map(row => row.id);
  if (quotes.length) await db.delete(tables.quotationVersions).where(inArray(tables.quotationVersions.quotationId, quotes));
  await db.delete(tables.quotations).where(eq(tables.quotations.sessionId, visitor.id));
  await db.delete(tables.consultationRuns).where(eq(tables.consultationRuns.sessionId, visitor.id));
  await db.delete(tables.customerSessions).where(eq(tables.customerSessions.customerId, customerId));
  await db.delete(tables.visitorSessions).where(eq(tables.visitorSessions.id, visitor.id));
  await db.delete(tables.customers).where(eq(tables.customers.id, customerId));
  if (staffIds.length) await db.delete(tables.customers).where(inArray(tables.customers.id, staffIds));
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
    expect((await casesRoute(get)).status).toBe(403);
    expect((await casesRoute(new NextRequest("http://localhost:3000/api/admin/cases"))).status).toBe(401);
    const caseParams = { params: Promise.resolve({ id: randomUUID() }) };
    const caseRequest = (cookie?: string, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/admin/cases/fixture", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: "{}" });
    expect((await caseActionRoute(caseRequest(), caseParams)).status).toBe(401);
    expect((await caseActionRoute(caseRequest(`travelmind_customer=${customerToken}`), caseParams)).status).toBe(403);
    expect((await caseActionRoute(caseRequest(`travelmind_customer=${customerToken}`, "https://other.test"), caseParams)).status).toBe(403);
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
  it("mide una cohorte de consultas con denominador y confirmación demo posterior", async () => {
    const [consultation] = await db.insert(tables.consultationRuns).values({ sessionId: visitor.id, correlationId: randomUUID(), aiMode: "deterministic", retrievalMode: "catalog", recommendationCount: 1, responseDurationMs: 800 }).returning();
    try {
      const q = await quote(100000, 1); const id = await reserve(q);
      const checkout = await bookingService.checkout(customerId, id, randomUUID());
      const sealed = provider.emit(checkout, "succeeded");
      await service.applyEvent(sealed.event, sealed.signature);
      const withConsultation = await readOperationalMetrics();
      expect(withConsultation.cohort).toMatchObject({ windowDays: 7 });
      expect(withConsultation.cohort.confirmedSessions).toBeLessThanOrEqual(withConsultation.cohort.consultedSessions);
      expect(withConsultation.kpis.automaticRecommendations).toBeLessThanOrEqual(withConsultation.kpis.consultations);
      expect(withConsultation.kpis.acceptedQuotes).toBeLessThanOrEqual(withConsultation.kpis.quotes);
      expect(withConsultation.kpis.confirmed).toBeLessThanOrEqual(withConsultation.kpis.reservations);
      expect(withConsultation.kpis.notificationsSent).toBeLessThanOrEqual(withConsultation.kpis.notifications);
      expect(withConsultation.kpis.firstResponseP50Ms).not.toBeNull();
      await db.delete(tables.consultationRuns).where(eq(tables.consultationRuns.id, consultation.id));
      const withoutConsultation = await readOperationalMetrics();
      expect(withConsultation.cohort.consultedSessions).toBe(withoutConsultation.cohort.consultedSessions + 1);
      expect(withConsultation.cohort.confirmedSessions).toBe(withoutConsultation.cohort.confirmedSessions + 1);
      expect(withConsultation.kpis.consultations).toBe(withoutConsultation.kpis.consultations + 1);
      expect(withConsultation.kpis.automaticRecommendations).toBe(withoutConsultation.kpis.automaticRecommendations + 1);
      expect(withConsultation.kpis.firstResponseSamples).toBe(withoutConsultation.kpis.firstResponseSamples + 1);
    } finally { await db.delete(tables.businessEvents).where(eq(tables.businessEvents.sourceId, consultation.id)); await db.delete(tables.consultationRuns).where(eq(tables.consultationRuns.id, consultation.id)); }
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
    expect((await bookingService.get(customerId, id, new Date(Date.now() + 48 * 3600000))).status).toBe("manual_review");
    await expect(bookingService.accept(customerId, id, { acceptedVersion: 1, acceptedTotalMinor: checkout.totalMinor, termsAccepted: true })).rejects.toMatchObject({ code: "MANUAL_REVIEW" });
    await expect(service.simulate(randomUUID(), checkout.id, "succeeded")).rejects.toMatchObject({ status: 404 });
    const [staff] = await db.insert(tables.customers).values({ username: `case_${randomUUID().slice(0, 8)}`, passwordHash: "fixture-not-used", role: "admin" }).returning();
    staffIds.push(staff.id);
    const [reservation] = await db.select().from(tables.reservations).where(eq(tables.reservations.id, id));
    const input = { action: "cancel_unverified" as const, reason: "Evento con importe discrepante sin pago verificado", expectedUpdatedAt: reservation.updatedAt.toISOString() };
    await db.update(tables.payments).set({ status: "succeeded" }).where(eq(tables.payments.id, checkout.id));
    await expect(actOnCase(staff.id, id, input, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "PAYMENT_UNRESOLVED" });
    await db.update(tables.payments).set({ status: "pending" }).where(eq(tables.payments.id, checkout.id));
    const key = randomUUID(); const result = await actOnCase(staff.id, id, input, key, randomUUID());
    expect(result.status).toBe("cancelled");
    expect(await actOnCase(staff.id, id, input, key, randomUUID())).toEqual(result);
    expect((await db.select().from(tables.payments).where(eq(tables.payments.id, checkout.id)))[0].status).toBe("cancelled");
    expect(await db.select().from(tables.paymentEvents).where(eq(tables.paymentEvents.id, `staff-void-${checkout.id}`))).toHaveLength(1);
    expect((await bookingService.get(customerId, id)).status).toBe("cancelled");
  });
  it("resuelve pago mock sin prueba de proveedor mediante reversión auditada de todos los intentos verificados", async () => {
    const [staff] = await db.insert(tables.customers).values({ username: `case_${randomUUID().slice(0, 8)}`, passwordHash: "fixture-not-used", role: "admin" }).returning();
    staffIds.push(staff.id);
    const q = await quote(); const id = await reserve(q); const checkout = await bookingService.checkout(customerId, id, randomUUID());
    await db.update(tables.payments).set({ status: "succeeded" }).where(eq(tables.payments.id, checkout.id));
    await db.insert(tables.paymentEvents).values({ id: `verified-${checkout.id}`, paymentId: checkout.id, type: "succeeded" });
    await db.update(tables.reservations).set({ status: "pending_provider" }).where(eq(tables.reservations.id, id));
    const timestamp = async () => (await db.select().from(tables.reservations).where(eq(tables.reservations.id, id)))[0].updatedAt.toISOString();
    const input = { action: "request_mock_refund" as const, reason: "No hay prueba de reserva del proveedor mock", expectedUpdatedAt: await timestamp() };
    await expect(actOnCase(staff.id, id, input, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "INVALID_STATE" });
    const old = new Date(Date.now() - 6 * 60000);
    await db.update(tables.reservations).set({ updatedAt: old, providerReference: "MOCK-UNVERIFIED" }).where(eq(tables.reservations.id, id));
    await expect(actOnCase(staff.id, id, { ...input, expectedUpdatedAt: old.toISOString() }, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "PAYMENT_UNRESOLVED" });
    await db.update(tables.reservations).set({ providerReference: null }).where(eq(tables.reservations.id, id));
    await db.delete(tables.paymentEvents).where(eq(tables.paymentEvents.id, `verified-${checkout.id}`));
    await expect(actOnCase(staff.id, id, { ...input, expectedUpdatedAt: old.toISOString() }, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "PAYMENT_UNRESOLVED" });
    await db.insert(tables.paymentEvents).values({ id: `verified-${checkout.id}`, paymentId: checkout.id, type: "succeeded" });
    const [second] = await db.insert(tables.payments).values({ reservationId: id, quoteVersion: q.version, totalMinor: q.totalMinor, status: "succeeded", idempotencyKey: randomUUID() }).returning();
    await db.insert(tables.paymentEvents).values({ id: `verified-${second.id}`, paymentId: second.id, type: "succeeded" });
    const key = randomUUID(); const request = { ...input, expectedUpdatedAt: old.toISOString() };
    const result = await actOnCase(staff.id, id, request, key, randomUUID());
    expect(result.status).toBe("refund_pending");
    expect(await actOnCase(staff.id, id, request, key, randomUUID())).toEqual(result);
    expect((await db.select().from(tables.payments).where(eq(tables.payments.reservationId, id))).map(payment => payment.refundStatus)).toEqual(["pending", "pending"]);
    await service.reconcileRefund(customerId, id); await service.reconcileRefund(customerId, id);
    expect((await db.select().from(tables.payments).where(eq(tables.payments.reservationId, id))).map(payment => payment.refundStatus)).toEqual(["refunded", "refunded"]);
    expect((await bookingService.get(customerId, id)).status).toBe("refunded");
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
  it("reabre una entrega agotada solo con admin, motivo e idempotencia y la procesa una vez", async () => {
    const [admin, agent] = await db.insert(tables.customers).values(["admin", "travel_agent"].map(role => ({ username: `retry_${randomUUID().slice(0, 8)}`, passwordHash: "fixture-not-used", role }))).returning();
    staffIds.push(admin.id, agent.id);
    const q = await quote(); const id = await reserve(q);
    const [event] = await db.select().from(tables.reservationEvents).where(eq(tables.reservationEvents.reservationId, id));
    const [delivery] = await db.insert(tables.notificationDeliveries).values({ reservationId: id, eventId: event.id, channel: "email", status: "failed", attempts: 3, body: "Notificación ficticia agotada" }).returning();
    await db.update(tables.workflowOutbox).set({ status: "completed", createdAt: new Date(0) }).where(eq(tables.workflowOutbox.eventId, event.id));
    expect((await exhaustedRoute(new NextRequest("http://localhost:3000/api/admin/notifications", { headers: { Cookie: `travelmind_customer=${customerToken}` } }))).status).toBe(403);
    const deniedRequest = new NextRequest(`http://localhost:3000/api/admin/notifications/${delivery.id}/retry`, { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", "Idempotency-Key": randomUUID(), Cookie: `travelmind_customer=${customerToken}` }, body: JSON.stringify({ reason: "Mailpit restaurado", confirmed: true }) });
    expect((await retryRoute(deniedRequest, { params: Promise.resolve({ id: delivery.id }) })).status).toBe(403);
    expect((await listExhaustedNotifications()).items.map(row => row.id)).toContain(delivery.id);
    const input = { reason: "Mailpit local restaurado y bandeja revisada", confirmed: true as const };
    await expect(retryExhaustedNotification(customerId, delivery.id, input, randomUUID(), randomUUID())).rejects.toMatchObject({ status: 403 });
    await expect(retryExhaustedNotification(agent.id, delivery.id, input, randomUUID(), randomUUID())).rejects.toMatchObject({ status: 403 });
    const key = randomUUID();
    const [first, repeated] = await Promise.all([retryExhaustedNotification(admin.id, delivery.id, input, key, randomUUID()), retryExhaustedNotification(admin.id, delivery.id, input, key, randomUUID())]);
    expect(first).toEqual(repeated);
    await expect(retryExhaustedNotification(admin.id, delivery.id, { ...input, reason: "Otro motivo" }, key, randomUUID())).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect((await db.select().from(tables.notificationDeliveries).where(eq(tables.notificationDeliveries.id, delivery.id)))[0]).toMatchObject({ status: "pending", attempts: 0 });
    expect((await db.select().from(tables.workflowOutbox).where(eq(tables.workflowOutbox.eventId, event.id)))[0].status).toBe("pending");
    expect(await db.select().from(tables.notificationRetryActions).where(eq(tables.notificationRetryActions.deliveryId, delivery.id))).toHaveLength(1);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ID: "fixture-supervised-mailpit" }))));
    try {
      await processOutbox();
      expect((await db.select().from(tables.notificationDeliveries).where(eq(tables.notificationDeliveries.id, delivery.id)))[0]).toMatchObject({ status: "sent_demo", attempts: 1, providerReference: "fixture-supervised-mailpit" });
      await processOutbox();
      expect(await db.select().from(tables.notificationDeliveries).where(eq(tables.notificationDeliveries.id, delivery.id))).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
    // Simula dos nuevos agotamientos locales para verificar el tope supervisado.
    await db.update(tables.notificationDeliveries).set({ status: "failed", attempts: 3, providerReference: null }).where(eq(tables.notificationDeliveries.id, delivery.id));
    await db.update(tables.workflowOutbox).set({ status: "completed" }).where(eq(tables.workflowOutbox.eventId, event.id));
    await retryExhaustedNotification(admin.id, delivery.id, input, randomUUID(), randomUUID());
    await db.update(tables.notificationDeliveries).set({ status: "failed", attempts: 3 }).where(eq(tables.notificationDeliveries.id, delivery.id));
    await db.update(tables.workflowOutbox).set({ status: "completed" }).where(eq(tables.workflowOutbox.eventId, event.id));
    await expect(retryExhaustedNotification(admin.id, delivery.id, input, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "RETRY_LIMIT", status: 429 });
    expect(await db.select().from(tables.notificationRetryActions).where(eq(tables.notificationRetryActions.deliveryId, delivery.id))).toHaveLength(2);
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
  it("un pago verificado en revisión conserva el caso tras vencer la cotización", async () => {
    const q = await quote(); const id = await reserve(q);
    await db.insert(tables.payments).values({ reservationId: id, quoteVersion: q.version, totalMinor: q.totalMinor, status: "succeeded", idempotencyKey: randomUUID() });
    await db.update(tables.reservations).set({ status: "manual_review", reason: "provider_unverified" }).where(eq(tables.reservations.id, id));
    expect((await bookingService.get(customerId, id, new Date(q.expiresAt))).status).toBe("manual_review");
    await db.update(tables.customers).set({ role: "admin" }).where(eq(tables.customers.id, customerId));
    const cases = await readOperationCases(1, customerId);
    expect(cases.items.find(row => row.id === id)).toMatchObject({ status: "manual_review", payments: [{ status: "succeeded" }] });
    expect(JSON.stringify(cases)).not.toContain("Responsable fixture");
    expect(JSON.stringify(cases)).not.toContain(customerId);
    expect(await readOperationCases(200, customerId)).toMatchObject({ items: [], hasMore: false });
    await db.update(tables.customers).set({ role: "customer" }).where(eq(tables.customers.id, customerId));
  });
  it("revisión por cambio de precio sin pago sí vence al cumplirse 24 horas", async () => {
    const q = await quote(); const id = await reserve(q);
    await db.update(tables.reservations).set({ status: "manual_review", reason: "price_changed" }).where(eq(tables.reservations.id, id));
    expect((await bookingService.get(customerId, id, new Date(q.expiresAt))).status).toBe("expired");
  });
  it("retención elimina sesiones vencidas y anonimiza a los 30 días conservando el registro", async () => {
    const now = new Date(); const expired = new Date(now.getTime() - 1000);
    const unused = await createVisitor(), linked = await createVisitor();
    const auth = await authenticateCustomer({ action: "register", username: `retain_${randomUUID().slice(0, 8)}`, password: "fixture-retention-local" }, unused.id);
    const bareQuote = randomUUID(), legacyHash = randomUUID().replaceAll("-", "");
    const issuedAt = new Date(now.getTime() - 48 * 3600000);
    await db.insert(tables.quotations).values({ id: bareQuote, sessionId: linked.id, issuedAt, expiresAt: new Date(issuedAt.getTime() + 86400000), correlationId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "fixture" });
    await db.update(tables.visitorSessions).set({ expiresAt: expired }).where(inArray(tables.visitorSessions.id, [unused.id, linked.id]));
    await db.update(tables.customerSessions).set({ expiresAt: expired }).where(eq(tables.customerSessions.customerId, auth.customer.id));
    await db.insert(tables.adminSessions).values({ tokenHash: legacyHash, actor: "fixture", role: "admin", expiresAt: expired });
    const [oldReservation] = await db.select().from(tables.reservations).where(eq(tables.reservations.customerId, customerId)).limit(1);
    await db.update(tables.reservations).set({ createdAt: new Date(now.getTime() - 30 * 86400000), travelerName: "Nombre ficticio retenido" }).where(eq(tables.reservations.id, oldReservation.id));
    try {
      const result = await applyRetention(now);
      expect(result.expiredAccountSessions).toBeGreaterThanOrEqual(1);
      expect(result.expiredLegacySessions).toBeGreaterThanOrEqual(1);
      expect(result.expiredVisitors).toBeGreaterThanOrEqual(1);
      expect(result.anonymizedTravelers).toBeGreaterThanOrEqual(1);
      expect(await db.select().from(tables.visitorSessions).where(eq(tables.visitorSessions.id, unused.id))).toHaveLength(0);
      expect(await db.select().from(tables.visitorSessions).where(eq(tables.visitorSessions.id, linked.id))).toHaveLength(1);
      expect(await db.select().from(tables.quotations).where(eq(tables.quotations.id, bareQuote))).toHaveLength(1);
      const [preserved] = await db.select().from(tables.reservations).where(eq(tables.reservations.id, oldReservation.id));
      expect(preserved).toMatchObject({ status: oldReservation.status, travelerName: null });
      await expect(requireCustomer(customerToken)).resolves.toBeDefined();
      expect(await applyRetention(now)).toMatchObject({ expiredAccountSessions: 0, expiredLegacySessions: 0, expiredVisitors: 0, anonymizedTravelers: 0 });
    } finally {
      await db.delete(tables.quotations).where(eq(tables.quotations.id, bareQuote));
      await db.delete(tables.customerSessions).where(eq(tables.customerSessions.customerId, auth.customer.id));
      await db.delete(tables.visitorSessions).where(inArray(tables.visitorSessions.id, [unused.id, linked.id]));
      await db.delete(tables.customers).where(eq(tables.customers.id, auth.customer.id));
      await db.delete(tables.adminSessions).where(eq(tables.adminSessions.tokenHash, legacyHash));
    }
  });
  it("retención respeta el lote de 100 y permite continuar en una segunda ejecución", async () => {
    const ids = Array.from({ length: 105 }, () => randomUUID());
    const now = new Date();
    await db.insert(tables.visitorSessions).values(ids.map(id => ({ id, tokenHash: id.replaceAll("-", "") + randomUUID().replaceAll("-", ""), expiresAt: new Date(0) })));
    try {
      const first = await applyRetention(now);
      expect(first.expiredVisitors).toBe(100);
      expect(await db.select({ id: tables.visitorSessions.id }).from(tables.visitorSessions).where(inArray(tables.visitorSessions.id, ids))).toHaveLength(5);
      expect((await applyRetention(now)).expiredVisitors).toBe(5);
      expect(await db.select({ id: tables.visitorSessions.id }).from(tables.visitorSessions).where(inArray(tables.visitorSessions.id, ids))).toHaveLength(0);
    } finally { await db.delete(tables.visitorSessions).where(inArray(tables.visitorSessions.id, ids)); }
  });
  it("asigna por rol, impide IDOR y registra notas y cierre sin duplicar ni saltar pagos", async () => {
    const staff = await db.insert(tables.customers).values(["admin", "travel_agent", "travel_agent"].map(role => ({ username: `case_${randomUUID().slice(0, 8)}`, passwordHash: "fixture-not-used", role }))).returning();
    staffIds.push(...staff.map(row => row.id)); const [admin, agent, other] = staff;
    const q = await quote(); const id = await reserve(q);
    await db.update(tables.reservations).set({ status: "manual_review", reason: "price_changed" }).where(eq(tables.reservations.id, id));
    const timestamp = async () => { const [row] = await db.select().from(tables.reservations).where(eq(tables.reservations.id, id)); return new Date(Math.max(row.updatedAt.getTime(), row.caseUpdatedAt?.getTime() ?? 0)).toISOString(); };
    const assign = { action: "assign" as const, assignee: agent.username, reason: "Asignación de atención fixture", expectedUpdatedAt: await timestamp() };
    await expect(readOperationCases(1, customerId)).rejects.toMatchObject({ status: 403 });
    await expect(actOnCase(customerId, id, assign, randomUUID(), randomUUID())).rejects.toMatchObject({ status: 403 });
    const key = randomUUID(); const [first, repeated] = await Promise.all([actOnCase(admin.id, id, assign, key, randomUUID()), actOnCase(admin.id, id, assign, key, randomUUID())]);
    expect(first).toEqual(repeated);
    expect((await readOperationCases(1, agent.id)).items.map(row => row.id)).toContain(id);
    expect((await readOperationCases(1, other.id)).items).toEqual([]);
    await expect(actOnCase(other.id, id, { action: "note", reason: "Nota no autorizada", expectedUpdatedAt: await timestamp() }, randomUUID(), randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(actOnCase(agent.id, id, { ...assign, expectedUpdatedAt: await timestamp() }, randomUUID(), randomUUID())).rejects.toMatchObject({ status: 403 });
    await expect(actOnCase(admin.id, id, { action: "note", reason: "Nota con estado desactualizado", expectedUpdatedAt: assign.expectedUpdatedAt }, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    const note = { action: "note" as const, reason: "Se revisó la tarifa y se indicó nueva cotización", expectedUpdatedAt: await timestamp() }; const noteKey = randomUUID();
    const saved = await actOnCase(agent.id, id, note, noteKey, randomUUID());
    expect(await actOnCase(agent.id, id, note, noteKey, randomUUID())).toEqual(saved);
    await expect(actOnCase(agent.id, id, { ...note, reason: "Contenido diferente" }, noteKey, randomUUID())).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const [payment] = await db.insert(tables.payments).values({ reservationId: id, quoteVersion: q.version, totalMinor: q.totalMinor, idempotencyKey: randomUUID() }).returning();
    const close = { action: "close_unpaid" as const, reason: "Cierre solicitado por cambio de tarifa fixture", expectedUpdatedAt: await timestamp() };
    await expect(actOnCase(agent.id, id, close, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "PAYMENT_UNRESOLVED" });
    await db.update(tables.payments).set({ status: "succeeded" }).where(eq(tables.payments.id, payment.id));
    await expect(actOnCase(agent.id, id, close, randomUUID(), randomUUID())).rejects.toMatchObject({ code: "PAYMENT_UNRESOLVED" });
    // Nota de atención no reinicia el reloj financiero ni oculta la alerta.
    const old = new Date(Date.now() - 600000);
    await db.update(tables.reservations).set({ status: "pending_provider", updatedAt: old }).where(eq(tables.reservations.id, id));
    const before = await readOperationalMetrics();
    await actOnCase(agent.id, id, { action: "note", reason: "Conciliación pendiente de evidencia", expectedUpdatedAt: await timestamp() }, randomUUID(), randomUUID());
    expect((await readOperationalMetrics()).alerts.unreconciledPayments).toBe(before.alerts.unreconciledPayments);
    // Fixture de intento fallido, sin evento ni fondos verificados en el recorrido.
    await db.update(tables.payments).set({ status: "failed" }).where(eq(tables.payments.id, payment.id));
    await db.update(tables.reservations).set({ status: "manual_review", reason: "price_changed" }).where(eq(tables.reservations.id, id));
    const finalInput = { ...close, expectedUpdatedAt: await timestamp() }, closeKey = randomUUID();
    const closed = await actOnCase(agent.id, id, finalInput, closeKey, randomUUID());
    expect(closed.status).toBe("cancelled");
    expect(await actOnCase(agent.id, id, finalInput, closeKey, randomUUID())).toEqual(closed);
    expect(await db.select().from(tables.caseActions).where(eq(tables.caseActions.reservationId, id))).toHaveLength(4);
    expect((await bookingService.get(customerId, id)).timeline.at(-1)?.event).toBe("cancelled");
    expect((await readOperationCases(1, agent.id)).items).toEqual([]);
  });
  it("cerrar sesión revoca el token de cliente y retira ambas cookies", async () => {
    const response = await signOutRoute(new NextRequest("http://localhost:3000/api/customer/session", { method: "DELETE", headers: { Origin: "http://localhost:3000", Cookie: `travelmind_customer=${customerToken}; travelmind_visitor=${visitor.token}` } }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("travelmind_customer")?.value).toBe("");
    expect(response.cookies.get("travelmind_visitor")?.value).toBe("");
    await expect(requireCustomer(customerToken)).rejects.toMatchObject({ status: 401 });
  });
});
