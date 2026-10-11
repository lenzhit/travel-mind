import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { approvalRequests, reservations } from "@/server/db/schema";
import { bookingService } from "@/server/services/booking.service";
import { paymentService } from "@/server/services/payment.service";
import { readOperationalMetrics } from "@/server/services/operational-metrics";
import { processOutbox } from "./outbox";
import { applyRetention } from "./retention";
import { AdminError } from "@/server/services/admin-errors";

function assertDemo() {
  if ((process.env.APP_MODE || "demo") !== "demo") throw new AdminError("DEMO_ONLY", "El workflow solo está habilitado en la simulación local.", 403);
}

export async function runConsultationWorkflow() {
  assertDemo();
  // This post-recommendation queue contains only mode/count metadata, never visitor text.
  const rows = await db.execute(sql`WITH due AS (
    SELECT id FROM consultation_runs WHERE processed_at IS NULL
    ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED
  ) UPDATE consultation_runs SET processed_at = now()
    WHERE id IN (SELECT id FROM due) RETURNING ai_mode, retrieval_mode, recommendation_count`);
  return {
    processed: rows.length,
    withRecommendations: rows.filter(row => Number(row.recommendation_count) > 0).length,
    withOllama: rows.filter(row => row.ai_mode === "ollama").length,
  };
}

export async function runQuotationWorkflow() {
  assertDemo();
  const rows = await db.execute(sql`WITH due AS (
    SELECT id FROM quotations WHERE status = 'issued' AND expires_at <= now()
    ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
  ) UPDATE quotations SET status = 'expired'
    WHERE id IN (SELECT id FROM due) RETURNING id`);
  return { expired: rows.length };
}

export async function runReservationWorkflow() {
  assertDemo();
  const refundRows = await db.select({ id: reservations.id, customerId: reservations.customerId }).from(reservations).where(eq(reservations.status, "refund_pending")).limit(10);
  let refundsReconciled = 0, refundsNeedsReview = 0;
  for (const row of refundRows) {
    try { if (await paymentService.reconcileRefund(row.customerId, row.id)) refundsReconciled++; }
    catch (error) { if (error instanceof AdminError && error.code === "REFUND_UNVERIFIED") refundsNeedsReview++; else throw error; }
  }
  const pending = await db.select({ id: reservations.id, customerId: reservations.customerId }).from(reservations)
    .innerJoin(approvalRequests, and(eq(approvalRequests.reservationId, reservations.id), eq(approvalRequests.quoteVersion, reservations.quoteVersion)))
    .where(and(eq(reservations.status, "pending_approval"), lte(approvalRequests.expiresAt, new Date()))).limit(50);
  for (const row of pending) await bookingService.get(row.customerId, row.id);
  return { approvalsChecked: pending.length, refundsReconciled, refundsNeedsReview };
}

export async function runNotificationWorkflow() {
  assertDemo();
  return processOutbox();
}

export async function runExceptionWorkflow() {
  assertDemo();
  const snapshot = await readOperationalMetrics();
  const retention = await applyRetention();
  const alerts = snapshot.alerts;
  // Only aggregate counters are logged. Case details remain behind staff RBAC.
  if (Object.values(alerts).some(value => value > 0)) console.warn(JSON.stringify({ event: "workflow_exceptions_detected", mode: "demo", alerts }));
  return { alerts, retention };
}

export const workflowHandlers = {
  consultation: runConsultationWorkflow,
  quotation: runQuotationWorkflow,
  reservation: runReservationWorkflow,
  notifications: runNotificationWorkflow,
  exception: runExceptionWorkflow,
} as const;
