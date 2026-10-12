import { eq, desc, and } from "drizzle-orm";
import { businessEvents, notificationDeliveries, payments, reservations } from "@/server/db/schema";

async function main() {
  process.loadEnvFile(".env.local");
  const { db, conn } = await import("@/server/db");
  try {
  const token = process.env.WORKFLOW_INTERNAL_TOKEN;
  if (!token || token.length < 32 || (process.env.APP_MODE || "demo") !== "demo") throw new Error("Local demo token required");
  const [event] = await db.select().from(businessEvents).where(and(eq(businessEvents.kind, "reservation"), eq(businessEvents.status, "completed"))).orderBy(desc(businessEvents.createdAt)).limit(1);
  if (!event) throw new Error("No completed reservation event");
  const before = { attempts: event.attempts, reservations: (await db.select({ id: reservations.id }).from(reservations)).length, payments: (await db.select({ id: payments.id }).from(payments)).length, deliveries: (await db.select({ id: notificationDeliveries.id }).from(notificationDeliveries)).length };
  const url = "http://127.0.0.1:5678/webhook/travelmind-reservation";
  const responses = await Promise.all(Array.from({ length: 2 }, () => fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-TravelMind-Event-Token": token }, body: JSON.stringify({ id: event.id, correlationId: event.correlationId }), signal: AbortSignal.timeout(5000) })));
  if (responses.some(response => !response.ok)) throw new Error("Webhook replay was not accepted");
  const callback = await fetch(`http://127.0.0.1:3000/api/internal/workflows/events/${event.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  const response = await callback.json();
  if (!callback.ok || response.data?.replayed !== true) throw new Error("Callback replay was not idempotent");
  const [after] = await db.select().from(businessEvents).where(eq(businessEvents.id, event.id));
  const counts = { reservations: (await db.select({ id: reservations.id }).from(reservations)).length, payments: (await db.select({ id: payments.id }).from(payments)).length, deliveries: (await db.select({ id: notificationDeliveries.id }).from(notificationDeliveries)).length };
  if (after.attempts !== before.attempts || counts.reservations !== before.reservations || counts.payments !== before.payments || counts.deliveries !== before.deliveries) throw new Error("Replay changed a critical count");
  console.log(JSON.stringify({ event: "business_event_replay_passed", mode: "demo", webhookAccepted: responses.length, callbackReplayed: true, state: after.status, attemptsUnchanged: true, criticalCountsUnchanged: true }));
  } finally { await conn.end(); }
}
main().catch(() => { console.error("El reenvío del evento requiere revisión."); process.exitCode = 1; });
