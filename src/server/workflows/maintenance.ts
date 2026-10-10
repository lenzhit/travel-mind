import { eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { reservations } from "@/server/db/schema";
import { bookingService } from "@/server/services/booking.service";
import { paymentService } from "@/server/services/payment.service";
import { processOutbox } from "./outbox";
export async function runMaintenance() {
  const rows = await db.select({ id: reservations.id, customerId: reservations.customerId }).from(reservations).where(eq(reservations.status, "refund_pending")).limit(10);
  for (const row of rows) await paymentService.reconcileRefund(row.customerId, row.id);
  const pending = await db.select({ id: reservations.id, customerId: reservations.customerId }).from(reservations).where(eq(reservations.status, "pending_approval")).limit(50);
  for (const row of pending) await bookingService.get(row.customerId, row.id);
  await db.update(reservations).set({ travelerName: null }).where(lt(reservations.createdAt, new Date(Date.now() - 30 * 86400000)));
  return processOutbox();
}
