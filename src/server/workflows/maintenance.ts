import { and, eq, lte } from "drizzle-orm";
import { db } from "@/server/db";
import { approvalRequests, reservations } from "@/server/db/schema";
import { bookingService } from "@/server/services/booking.service";
import { paymentService } from "@/server/services/payment.service";
import { processOutbox } from "./outbox";
import { AdminError } from "@/server/services/admin-errors";
import { applyRetention } from "./retention";
import { dispatchBusinessEvents } from "./business-events";
export async function runMaintenance() {
  if ((process.env.APP_MODE || "demo") !== "demo") throw new AdminError("DEMO_ONLY", "El mantenimiento solo está habilitado en el entorno local de simulación.", 403);
  const rows = await db.select({ id: reservations.id, customerId: reservations.customerId }).from(reservations).where(eq(reservations.status, "refund_pending")).limit(10);
  let refundsReconciled = 0, refundsNeedsReview = 0;
  for (const row of rows) {
    try { if (await paymentService.reconcileRefund(row.customerId, row.id)) refundsReconciled++; }
    catch (error) { if (error instanceof AdminError && error.code === "REFUND_UNVERIFIED") refundsNeedsReview++; else throw error; }
  }
  const pending = await db.select({ id: reservations.id, customerId: reservations.customerId }).from(reservations).innerJoin(approvalRequests, and(eq(approvalRequests.reservationId, reservations.id), eq(approvalRequests.quoteVersion, reservations.quoteVersion))).where(and(eq(reservations.status, "pending_approval"), lte(approvalRequests.expiresAt, new Date()))).limit(50);
  for (const row of pending) await bookingService.get(row.customerId, row.id);
  const retention = await applyRetention();
  const outbox = await processOutbox();
  const eventDispatch = await dispatchBusinessEvents(5);
  return { ...outbox, refundsReconciled, refundsNeedsReview, retention, eventDispatch };
}
