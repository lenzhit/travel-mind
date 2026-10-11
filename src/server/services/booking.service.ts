import { createHash } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { approvalDecisions, approvalRequests, notificationDeliveries, payments, quotations, quotationVersions, reservationConsents, reservationEvents, reservations } from "@/server/db/schema";
import { POLICY_TEXT, POLICY_VERSION, type AcceptanceInput, type ReserveInput } from "@/features/reservations/schemas";
import { AdminError } from "./admin-errors";
import { changeStatus, createApproval, expirePendingApprovals, ownedReservation, recordReservationEvent, refreshQuote, type BookingTx } from "./booking-core";
const hash = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
const unwrap = <T>(result: { value: T } | { error: AdminError }): T => { if ("error" in result) throw result.error; return result.value; };
const accepted = (input: AcceptanceInput, quote: Awaited<ReturnType<typeof refreshQuote>>) => input.termsAccepted && input.acceptedVersion === quote.version && input.acceptedTotalMinor === quote.snapshot.totalMinor;
const priceError = () => new AdminError("PRICE_CHANGED", "La tarifa o las condiciones cambiaron. Revisa la nueva versión y acepta nuevamente.", 409);
type Checkout = { id: string; status: string; totalMinor: number; currency: string; simulated: boolean };
async function consent(tx: BookingTx, reservation: typeof reservations.$inferSelect, totalMinor: number) {
  await tx.insert(reservationConsents).values({ reservationId: reservation.id, customerId: reservation.customerId, quoteVersion: reservation.quoteVersion, totalMinor, policyVersion: POLICY_VERSION }).onConflictDoNothing();
}
export const bookingService = {
  async revalidate(customerId: string, quotationId: string, now = new Date()) {
    return db.transaction(async tx => {
      const result = await refreshQuote(tx, customerId, quotationId, now);
      return { quotationId, version: result.version, ...result.snapshot, available: result.available, mode: "demo", policyVersion: POLICY_VERSION, policy: POLICY_TEXT };
    });
  },
  async reserve(customerId: string, input: ReserveInput, key: string, correlationId: string, now = new Date()) {
    const result = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${customerId}, 1))`);
      const [existing] = await tx.select().from(reservations).where(and(eq(reservations.customerId, customerId), eq(reservations.idempotencyKey, key)));
      if (existing) { if (existing.payloadHash !== hash(input)) throw new AdminError("IDEMPOTENCY_CONFLICT", "Esta solicitud ya se utilizó con otros datos.", 409); return { value: existing.id }; }
      const [sameQuote] = await tx.select().from(reservations).where(and(eq(reservations.quotationId, input.quotationId), eq(reservations.customerId, customerId)));
      if (sameQuote) throw new AdminError("RESERVATION_EXISTS", "Ya existe una solicitud para esta cotización. Consúltala en Mis reservas.", 409);
      const [amount] = await tx.select({ count: count() }).from(reservations).where(eq(reservations.customerId, customerId));
      if (amount.count >= 20) throw new AdminError("RESERVATION_LIMIT", "Alcanzaste el límite de solicitudes de tu cuenta.", 429);
      const quote = await refreshQuote(tx, customerId, input.quotationId, now);
      if (!accepted(input, quote)) return { error: priceError() };
      if (!quote.available) throw new AdminError("AVAILABILITY_UNVERIFIED", "No hay cupos verificados para el grupo y la fecha solicitados.", 422);
      const [reservation] = await tx.insert(reservations).values({ customerId, quotationId: input.quotationId, quoteVersion: quote.version, travelerName: input.travelerName, status: quote.snapshot.requiresApproval ? "pending_approval" : "pending_payment", idempotencyKey: key, payloadHash: hash(input), correlationId }).returning();
      await consent(tx, reservation, quote.snapshot.totalMinor);
      if (quote.snapshot.requiresApproval) await createApproval(tx, reservation, quote.quote.expiresAt, now);
      await recordReservationEvent(tx, reservation, "reservation_requested", customerId);
      return { value: reservation.id };
    });
    return unwrap<string>(result);
  },
  async accept(customerId: string, id: string, input: AcceptanceInput, now = new Date()) {
    const result = await db.transaction(async tx => {
      const reservation = await ownedReservation(tx, customerId, id);
      if (!["pending_payment", "pending_approval", "manual_review"].includes(reservation.status)) throw new AdminError("INVALID_STATE", "Esta reserva no admite una nueva aceptación.", 409);
      if (reservation.status === "manual_review" && reservation.reason !== "price_changed") throw new AdminError("MANUAL_REVIEW", "Un asesor debe revisar esta operación antes de continuar.", 409);
      const quote = await refreshQuote(tx, customerId, reservation.quotationId, now);
      if (!accepted(input, quote)) return { error: priceError() };
      if (!quote.available) throw new AdminError("AVAILABILITY_UNVERIFIED", "La disponibilidad requiere revisión de un asesor.", 422);
      if (reservation.quoteVersion === quote.version && reservation.status !== "manual_review") return { value: id };
      await expirePendingApprovals(tx, id);
      const [updated] = await tx.update(reservations).set({ quoteVersion: quote.version }).where(eq(reservations.id, id)).returning();
      Object.assign(reservation, updated);
      await consent(tx, reservation, quote.snapshot.totalMinor);
      await changeStatus(tx, reservation, quote.snapshot.requiresApproval ? "pending_approval" : "pending_payment", customerId);
      if (quote.snapshot.requiresApproval) await createApproval(tx, reservation, quote.quote.expiresAt, now);
      return { value: id };
    }); return unwrap<string>(result);
  },
  async checkout(customerId: string, id: string, key: string, now = new Date()) {
    const result = await db.transaction(async tx => {
      const reservation = await ownedReservation(tx, customerId, id);
      const [existing] = await tx.select().from(payments).where(and(eq(payments.reservationId, id), eq(payments.idempotencyKey, key)));
      if (existing) return { value: { id: existing.id, status: existing.status, totalMinor: existing.totalMinor, currency: existing.currency, simulated: true } };
      if (reservation.status !== "pending_payment") throw new AdminError("INVALID_STATE", "La reserva todavía no está lista para pagar.", 409);
      const quote = await refreshQuote(tx, customerId, reservation.quotationId, now);
      if (quote.version !== reservation.quoteVersion) {
        await expirePendingApprovals(tx, id);
        await changeStatus(tx, reservation, "manual_review", "system", "price_changed");
        return { error: priceError() };
      }
      if (!quote.available) throw new AdminError("AVAILABILITY_UNVERIFIED", "No hay cupos verificados. Consulta a un asesor antes de continuar.", 422);
      const [acceptance] = await tx.select().from(reservationConsents).where(and(eq(reservationConsents.reservationId, id), eq(reservationConsents.quoteVersion, quote.version)));
      if (!acceptance || acceptance.totalMinor !== quote.snapshot.totalMinor) throw new AdminError("CONSENT_REQUIRED", "Debes aceptar el precio vigente antes de pagar.", 409);
      if (quote.snapshot.requiresApproval) {
        const [approval] = await tx.select().from(approvalRequests).where(and(eq(approvalRequests.reservationId, id), eq(approvalRequests.quoteVersion, quote.version)));
        if (approval?.status !== "approved") throw new AdminError("APPROVAL_REQUIRED", "La reserva necesita aprobación de un asesor.", 409);
      }
      const [attempts] = await tx.select({ count: count() }).from(payments).where(eq(payments.reservationId, id));
      if (attempts.count >= 3) throw new AdminError("PAYMENT_LIMIT", "El pago necesita revisión de un asesor.", 429);
      if ((process.env.PAYMENT_PROVIDER || "mock") !== "mock") throw new AdminError("PAYMENT_UNAVAILABLE", "El pago no está habilitado en este entorno.", 503);
      const [payment] = await tx.insert(payments).values({ reservationId: id, quoteVersion: quote.version, totalMinor: quote.snapshot.totalMinor, idempotencyKey: key }).returning();
      await changeStatus(tx, reservation, "payment_processing", customerId);
      return { value: { id: payment.id, status: payment.status, totalMinor: payment.totalMinor, currency: payment.currency, simulated: true } };
    }); return unwrap<Checkout>(result);
  },
  async get(customerId: string, id: string, now = new Date()) {
    return db.transaction(async tx => {
      const reservation = await ownedReservation(tx, customerId, id);
      const [quote] = await tx.select().from(quotations).where(eq(quotations.id, reservation.quotationId));
      const [version] = await tx.select().from(quotationVersions).where(and(eq(quotationVersions.quotationId, reservation.quotationId), eq(quotationVersions.version, reservation.quoteVersion)));
      const [current] = await tx.select().from(quotationVersions).where(eq(quotationVersions.quotationId, reservation.quotationId)).orderBy(desc(quotationVersions.version)).limit(1);
      const [approval] = await tx.select().from(approvalRequests).where(and(eq(approvalRequests.reservationId, id), eq(approvalRequests.quoteVersion, reservation.quoteVersion)));
      const paymentRows = await tx.select({ id: payments.id, status: payments.status, totalMinor: payments.totalMinor, currency: payments.currency, refundStatus: payments.refundStatus }).from(payments).where(eq(payments.reservationId, id)).orderBy(desc(payments.createdAt));
      const hasUnresolvedPayment = paymentRows.some(payment => ["created", "pending", "succeeded"].includes(payment.status) && payment.refundStatus !== "refunded");
      if (!hasUnresolvedPayment && ["pending_payment", "pending_approval", "manual_review"].includes(reservation.status) && (now >= quote.expiresAt || (reservation.status === "pending_approval" && approval && now >= approval.expiresAt))) {
        await expirePendingApprovals(tx, id); if (approval?.status === "pending") approval.status = "expired"; await changeStatus(tx, reservation, "expired", "system", "deadline_expired");
      }
      const timeline = await tx.select({ id: reservationEvents.id, event: reservationEvents.event, createdAt: reservationEvents.createdAt }).from(reservationEvents).where(eq(reservationEvents.reservationId, id)).orderBy(reservationEvents.createdAt, reservationEvents.id);
      const notifications = await tx.select({ id: notificationDeliveries.id, channel: notificationDeliveries.channel, status: notificationDeliveries.status, body: notificationDeliveries.body }).from(notificationDeliveries).where(eq(notificationDeliveries.reservationId, id));
      return { id, quotationId: reservation.quotationId, status: reservation.status, reason: reservation.reason, travelerName: reservation.travelerName, version: reservation.quoteVersion, ...version.snapshot, currentVersion: current.version, expiresAt: quote.expiresAt.toISOString(), providerReference: reservation.providerReference, approval: approval ? { id: approval.id, status: approval.status, expiresAt: approval.expiresAt.toISOString() } : null, payments: paymentRows, timeline, notifications, simulated: true, policy: POLICY_TEXT };
    });
  },
  async list(customerId: string) { return db.select({ id: reservations.id, status: reservations.status, createdAt: reservations.createdAt, quotationId: reservations.quotationId }).from(reservations).where(eq(reservations.customerId, customerId)).orderBy(desc(reservations.createdAt)).limit(20); },
  async decide(approvalId: string, actor: string, input: { decision: "approved" | "rejected"; reason: string }, now = new Date()) {
    const result = await db.transaction(async tx => {
      const [found] = await tx.select().from(approvalRequests).where(eq(approvalRequests.id, approvalId));
      if (!found) throw new AdminError("NOT_FOUND", "No se encontró la aprobación.", 404);
      const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, found.reservationId)).for("update");
      const [approval] = await tx.select().from(approvalRequests).where(eq(approvalRequests.id, approvalId)).for("update");
      const [existing] = await tx.select().from(approvalDecisions).where(eq(approvalDecisions.approvalId, approvalId));
      if (existing) { if (existing.decision !== input.decision || existing.reason !== input.reason) throw new AdminError("DECISION_CONFLICT", "Esta solicitud ya tiene una decisión.", 409); return { value: reservation.id }; }
      if (approval.status !== "pending" || reservation.status !== "pending_approval" || approval.quoteVersion !== reservation.quoteVersion) throw new AdminError("INVALID_STATE", "La solicitud ya no está pendiente de aprobación.", 409);
      if (now >= approval.expiresAt) { await expirePendingApprovals(tx, reservation.id); await changeStatus(tx, reservation, "expired", "system"); return { error: new AdminError("APPROVAL_EXPIRED", "La solicitud de aprobación venció.", 422) }; }
      if (input.decision === "approved") {
        const quote = await refreshQuote(tx, reservation.customerId, reservation.quotationId, now);
        if (quote.version !== reservation.quoteVersion) { await expirePendingApprovals(tx, reservation.id); await changeStatus(tx, reservation, "manual_review", "system", "price_changed"); return { error: priceError() }; }
        if (!quote.available) throw new AdminError("AVAILABILITY_UNVERIFIED", "La disponibilidad requiere revisión antes de aprobar.", 422);
      }
      await tx.update(approvalRequests).set({ status: input.decision }).where(eq(approvalRequests.id, approvalId));
      await tx.insert(approvalDecisions).values({ approvalId, actor, ...input });
      await changeStatus(tx, reservation, input.decision === "approved" ? "pending_payment" : "rejected", actor, input.decision === "rejected" ? "approval_rejected" : null);
      return { value: reservation.id };
    }); return unwrap<string>(result);
  },
  async approvals() {
    return db.select({ id: approvalRequests.id, reservationId: reservations.id, status: approvalRequests.status, version: approvalRequests.quoteVersion, expiresAt: approvalRequests.expiresAt, travelerName: reservations.travelerName, snapshot: quotationVersions.snapshot }).from(approvalRequests).innerJoin(reservations, eq(approvalRequests.reservationId, reservations.id)).innerJoin(quotationVersions, and(eq(quotationVersions.quotationId, reservations.quotationId), eq(quotationVersions.version, approvalRequests.quoteVersion))).orderBy(desc(approvalRequests.createdAt)).limit(50);
  },
};
