import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { caseActions, customers, paymentEvents, payments, providerBookingAttempts, reservations } from "@/server/db/schema";
import type { CaseActionInput } from "@/features/analytics/case-schemas";
import { AdminError } from "./admin-errors";
import { changeStatus, expirePendingApprovals, type BookingTx } from "./booking-core";
export async function caseActor(store: Pick<BookingTx, "select">, actorId: string) {
  const [actor] = await store.select({ id: customers.id, role: customers.role }).from(customers).where(eq(customers.id, actorId)).for("share");
  if (!actor || !["admin", "travel_agent"].includes(actor.role)) throw new AdminError("FORBIDDEN", "Tu cuenta no tiene permiso para atender incidencias.", 403);
  return actor;
}
export async function actOnCase(actorId: string, id: string, input: CaseActionInput, key: string, correlationId: string) {
  return db.transaction(async tx => {
    const actor = await caseActor(tx, actorId);
    const [reservation] = await tx.select().from(reservations).where(and(eq(reservations.id, id), actor.role === "admin" ? undefined : eq(reservations.caseAssigneeId, actorId))).for("update");
    if (!reservation) throw new AdminError("NOT_FOUND", "No se encontró un caso autorizado.", 404);
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const [existing] = await tx.select().from(caseActions).where(and(eq(caseActions.reservationId, id), eq(caseActions.idempotencyKey, key)));
    if (existing) {
      if (existing.actorId !== actorId || existing.payloadHash !== hash) throw new AdminError("IDEMPOTENCY_CONFLICT", "Esta llave ya corresponde a otra decisión.", 409);
      return { id: existing.id, status: existing.resultStatus };
    }
    const lastChange = Math.max(reservation.updatedAt.getTime(), reservation.caseUpdatedAt?.getTime() ?? 0);
    if (lastChange !== new Date(input.expectedUpdatedAt).getTime()) throw new AdminError("STATE_CONFLICT", "El caso cambió. Actualiza las incidencias antes de decidir.", 409);
    const [amount] = await tx.select({ count: sql<number>`count(*)::int` }).from(caseActions).where(eq(caseActions.reservationId, id));
    if (amount.count >= 100) throw new AdminError("CASE_ACTION_LIMIT", "Este caso alcanzó el límite de anotaciones; requiere revisión local.", 429);
    if (!["manual_review", "refund_pending", "pending_provider"].includes(reservation.status)) throw new AdminError("INVALID_STATE", "Esta solicitud ya no admite atención de incidencias.", 409);
    const updatedAt = new Date(Math.max(Date.now(), lastChange + 1));
    let assigneeId: string | null = null;
    if (input.action === "assign") {
      if (actor.role !== "admin") throw new AdminError("FORBIDDEN", "Solo un administrador puede asignar casos.", 403);
      const [assignee] = await tx.select().from(customers).where(and(eq(customers.username, input.assignee), eq(customers.role, "travel_agent"))).for("share");
      if (!assignee) throw new AdminError("INVALID_ASSIGNEE", "El usuario debe ser un agente de viajes activo.", 422);
      assigneeId = assignee.id;
      await tx.update(reservations).set({ caseAssigneeId: assignee.id, caseUpdatedAt: updatedAt }).where(eq(reservations.id, id));
    } else if (input.action === "close_unpaid") {
      if (reservation.status !== "manual_review" || reservation.reason !== "price_changed") throw new AdminError("MANUAL_REVIEW", "El cierre exige una revisión por cambio de tarifa sin pago pendiente.", 409);
      const paymentRows = await tx.select().from(payments).where(eq(payments.reservationId, id)).for("update");
      if (paymentRows.some(payment => ["created", "pending", "succeeded"].includes(payment.status))) throw new AdminError("PAYMENT_UNRESOLVED", "No se puede cerrar un caso con pago pendiente o verificado.", 409);
      await expirePendingApprovals(tx, id);
      await changeStatus(tx, reservation, "cancelled", actorId, "staff_closed_unpaid");
      await tx.update(reservations).set({ caseUpdatedAt: updatedAt }).where(eq(reservations.id, id));
    } else if (input.action === "cancel_unverified") {
      if (reservation.status !== "manual_review" || reservation.reason !== "payment_amount_mismatch") throw new AdminError("INVALID_STATE", "Solo puede cancelarse un pago simulado cuyo importe quedó sin verificar.", 409);
      const paymentRows = await tx.select().from(payments).where(eq(payments.reservationId, id)).for("update");
      const attempts = await tx.select({ id: providerBookingAttempts.id }).from(providerBookingAttempts).where(eq(providerBookingAttempts.reservationId, id));
      if (!paymentRows.length || paymentRows.some(payment => payment.status === "succeeded") || attempts.length || reservation.providerReference) throw new AdminError("PAYMENT_UNRESOLVED", "Existe evidencia de pago o proveedor que requiere otra conciliación.", 409);
      for (const payment of paymentRows) {
        if (payment.status !== "pending" && payment.status !== "created") continue;
        await tx.update(payments).set({ status: "cancelled" }).where(eq(payments.id, payment.id));
        await tx.insert(paymentEvents).values({ id: `staff-void-${payment.id}`, paymentId: payment.id, type: "staff_voided_unverified" }).onConflictDoNothing();
      }
      await expirePendingApprovals(tx, id);
      await changeStatus(tx, reservation, "cancelled", actorId, "staff_cancelled_unverified");
      await tx.update(reservations).set({ caseUpdatedAt: updatedAt }).where(eq(reservations.id, id));
    } else if (input.action === "request_mock_refund") {
      if (reservation.status !== "pending_provider" || Date.now() - reservation.updatedAt.getTime() < 300000) throw new AdminError("INVALID_STATE", "Espera la verificación del proveedor antes de solicitar la reversión.", 409);
      const paymentRows = await tx.select().from(payments).where(eq(payments.reservationId, id)).for("update");
      const succeeded = paymentRows.filter(payment => payment.status === "succeeded");
      const attempts = await tx.select({ status: providerBookingAttempts.status, reference: providerBookingAttempts.providerReference }).from(providerBookingAttempts).where(eq(providerBookingAttempts.reservationId, id));
      if (!succeeded.length || paymentRows.some(payment => ["created", "pending"].includes(payment.status)) || succeeded.some(payment => payment.refundStatus !== "not_required") || attempts.some(attempt => attempt.status !== "failed" || attempt.reference) || reservation.providerReference) throw new AdminError("PAYMENT_UNRESOLVED", "La evidencia de pago o proveedor requiere otra conciliación.", 409);
      const verifiedEvents = await tx.select({ paymentId: paymentEvents.paymentId }).from(paymentEvents).where(and(inArray(paymentEvents.paymentId, succeeded.map(payment => payment.id)), eq(paymentEvents.type, "succeeded")));
      if (succeeded.some(payment => !verifiedEvents.some(event => event.paymentId === payment.id))) throw new AdminError("PAYMENT_UNRESOLVED", "Falta el evento verificado del pago simulado.", 409);
      for (const payment of succeeded) {
        await tx.update(payments).set({ refundStatus: "pending" }).where(eq(payments.id, payment.id));
        await tx.insert(paymentEvents).values({ id: `refund-${payment.id}`, paymentId: payment.id, type: "refund_requested" }).onConflictDoNothing();
      }
      await changeStatus(tx, reservation, "refund_pending", actorId, "staff_requested_mock_refund");
      await tx.update(reservations).set({ caseUpdatedAt: updatedAt }).where(eq(reservations.id, id));
    } else {
      await tx.update(reservations).set({ caseUpdatedAt: updatedAt }).where(eq(reservations.id, id));
    }
    const [action] = await tx.insert(caseActions).values({ reservationId: id, actorId, assigneeId, action: input.action, reason: input.reason, idempotencyKey: key, payloadHash: hash, resultStatus: reservation.status, correlationId }).returning({ id: caseActions.id });
    return { id: action.id, status: reservation.status };
  });
}
