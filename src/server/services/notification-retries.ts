import { createHash } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { customers, notificationDeliveries, notificationRetryActions, workflowOutbox } from "@/server/db/schema";
import { AdminError } from "./admin-errors";

export async function listExhaustedNotifications() {
  const rows = await db.select({ id: notificationDeliveries.id, reservationId: notificationDeliveries.reservationId, channel: notificationDeliveries.channel, attempts: notificationDeliveries.attempts })
    .from(notificationDeliveries).where(and(eq(notificationDeliveries.status, "failed"), sql`${notificationDeliveries.attempts} >= 3`))
    .orderBy(asc(notificationDeliveries.id)).limit(21);
  return { items: rows.slice(0, 20), hasMore: rows.length > 20, simulated: true as const };
}

export async function retryExhaustedNotification(actorId: string, deliveryId: string, input: { reason: string; confirmed: true }, key: string, correlationId: string) {
  if ((process.env.APP_MODE || "demo") !== "demo" || (process.env.EMAIL_PROVIDER || "mailpit") !== "mailpit" || (process.env.WHATSAPP_PROVIDER || "mock") !== "mock") throw new AdminError("DEMO_ONLY", "El reintento solo está disponible con proveedores locales de prueba.", 403);
  return db.transaction(async tx => {
    const [actor] = await tx.select({ role: customers.role }).from(customers).where(eq(customers.id, actorId)).for("share");
    if (actor?.role !== "admin") throw new AdminError("FORBIDDEN", "Solo un administrador puede reabrir entregas agotadas.", 403);
    const [reference] = await tx.select({ eventId: notificationDeliveries.eventId }).from(notificationDeliveries).where(eq(notificationDeliveries.id, deliveryId));
    if (!reference) throw new AdminError("NOT_FOUND", "No se encontró la entrega.", 404);
    // Match the outbox processor's lock order to avoid a retry/send deadlock.
    const [outbox] = await tx.select().from(workflowOutbox).where(eq(workflowOutbox.eventId, reference.eventId)).for("update");
    const [delivery] = await tx.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, deliveryId)).for("update");
    if (!outbox || !delivery || delivery.eventId !== reference.eventId) throw new AdminError("STATE_CONFLICT", "La entrega cambió; actualiza la lista.", 409);
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const [existing] = await tx.select().from(notificationRetryActions).where(and(eq(notificationRetryActions.deliveryId, deliveryId), eq(notificationRetryActions.idempotencyKey, key)));
    if (existing) {
      if (existing.actorId !== actorId || existing.payloadHash !== hash) throw new AdminError("IDEMPOTENCY_CONFLICT", "La llave ya corresponde a otra decisión.", 409);
      return { id: existing.id, queued: true as const };
    }
    if (delivery.status !== "failed" || delivery.attempts < 3) throw new AdminError("INVALID_STATE", "Solo se puede reabrir una entrega con tres intentos fallidos.", 409);
    const [count] = await tx.select({ value: sql<number>`count(*)::int` }).from(notificationRetryActions).where(eq(notificationRetryActions.deliveryId, deliveryId));
    if (count.value >= 2) throw new AdminError("RETRY_LIMIT", "La entrega agotó los reintentos supervisados.", 429);
    await tx.update(notificationDeliveries).set({ status: "pending", attempts: 0, nextAttemptAt: new Date(), providerReference: null }).where(eq(notificationDeliveries.id, deliveryId));
    await tx.update(workflowOutbox).set({ status: "pending" }).where(eq(workflowOutbox.id, outbox.id));
    const [action] = await tx.insert(notificationRetryActions).values({ deliveryId, actorId, reason: input.reason, idempotencyKey: key, payloadHash: hash, correlationId }).returning({ id: notificationRetryActions.id });
    return { id: action.id, queued: true as const };
  });
}
