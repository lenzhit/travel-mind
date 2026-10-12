import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/server/db";
import { businessEvents, consultationRuns, quotations, reservationEvents } from "@/server/db/schema";
import { AdminError } from "@/server/services/admin-errors";
import { processOutbox } from "./outbox";
import { runExceptionWorkflow, runReservationWorkflow } from "./business";

const kinds = ["consultation", "quotation", "reservation", "notifications", "exception"] as const;
type Kind = typeof kinds[number];
const maxAttempts = 4;

export function scheduleBusinessDispatch() {
  try {
    after(() => dispatchBusinessEvents(5).then(() => undefined).catch(() => {
      console.warn(JSON.stringify({ event: "business_event_dispatch_deferred", mode: "demo" }));
    }));
  } catch {
    // A caller outside a Next.js request (e.g. integration test) has no after-context.
    // The committed event remains available to the scheduled recovery worker.
    if (process.env.NODE_ENV !== "test") console.warn(JSON.stringify({ event: "business_event_dispatch_deferred", mode: "demo" }));
  }
}

function webhookBase() {
  const url = new URL(process.env.N8N_WEBHOOK_URL || "http://127.0.0.1:5678/webhook");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.protocol !== "http:" || url.port !== "5678" || url.pathname !== "/webhook") {
    throw new AdminError("WORKFLOW_CONFIG", "El webhook debe apuntar al n8n local.", 503);
  }
  return url.href.replace(/\/$/, "");
}

export async function dispatchBusinessEvents(limit = 20) {
  if ((process.env.APP_MODE || "demo") !== "demo" || (process.env.WORKFLOW_PROVIDER || "n8n-local") !== "n8n-local") return { checked: 0, accepted: 0, unavailable: 0 };
  const token = process.env.WORKFLOW_INTERNAL_TOKEN;
  if (!token || token.length < 32) return { checked: 0, accepted: 0, unavailable: 0 };
  await quarantineExpiredLeases();
  const base = webhookBase();
  const now = new Date();
  const due = await db.select({ id: businessEvents.id, kind: businessEvents.kind, correlationId: businessEvents.correlationId, deliveryAttempts: businessEvents.deliveryAttempts })
    .from(businessEvents)
    .where(or(and(eq(businessEvents.status, "pending"), lte(businessEvents.nextAttemptAt, now)), and(eq(businessEvents.status, "processing"), lte(businessEvents.leaseUntil, now))))
    .orderBy(businessEvents.createdAt).limit(Math.min(Math.max(limit, 1), 50));
  let accepted = 0, unavailable = 0;
  for (const event of due) {
    if (!kinds.includes(event.kind as Kind)) continue;
    let delivered = false;
    try {
      const response = await fetch(`${base}/travelmind-${event.kind}`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-TravelMind-Event-Token": token },
        body: JSON.stringify({ id: event.id, correlationId: event.correlationId }),
        signal: AbortSignal.timeout(2500), cache: "no-store",
      });
      if (!response.ok) throw new Error("WEBHOOK_REJECTED");
      delivered = true; accepted++;
    } catch { unavailable++; }
    // Delivery is not completion. Only the authenticated callback can complete it.
    const delay = delivered ? 300000 : Math.min(300000, 1000 * 2 ** Math.min(event.deliveryAttempts, 8));
    await db.update(businessEvents).set({ deliveryAttempts: event.deliveryAttempts + 1, nextAttemptAt: new Date(Date.now() + delay) })
      .where(and(eq(businessEvents.id, event.id), inArray(businessEvents.status, ["pending", "processing"])));
  }
  return { checked: due.length, accepted, unavailable };
}

export async function quarantineExpiredLeases() {
  return db.transaction(async tx => {
    const stale = await tx.execute(sql`UPDATE business_events
      SET status = 'dead', lease_token = NULL, lease_until = NULL, error_code = 'LEASE_EXHAUSTED'
      WHERE status = 'processing' AND lease_until <= now() AND attempts >= ${maxAttempts}
      RETURNING id, kind, correlation_id`);
    for (const event of stale) {
      if (event.kind !== "exception") await tx.insert(businessEvents).values({ kind: "exception", sourceId: String(event.id), correlationId: String(event.correlation_id) }).onConflictDoNothing();
    }
    return stale.length;
  });
}

export async function processBusinessEvent(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AdminError("INVALID_EVENT_ID", "Identificador de evento inválido.", 400);
  const [claimed] = await db.execute(sql`UPDATE business_events
    SET status = 'processing', attempts = attempts + 1, lease_token = gen_random_uuid(), lease_until = now() + interval '60 seconds'
    WHERE id = ${id}::uuid AND attempts < ${maxAttempts}
      AND (status = 'pending' OR (status = 'processing' AND lease_until <= now()))
    RETURNING id, kind, source_id, correlation_id, lease_token, attempts`);
  if (!claimed) {
    const [current] = await db.select({ status: businessEvents.status }).from(businessEvents).where(eq(businessEvents.id, id));
    if (!current) throw new AdminError("EVENT_NOT_FOUND", "Evento no encontrado.", 404);
    return { id, status: current.status, replayed: true };
  }
  const kind = claimed.kind as Kind;
  const sourceId = String(claimed.source_id);
  const leaseToken = String(claimed.lease_token);
  try {
    if (kind === "consultation") {
      const [source] = await db.select({ id: consultationRuns.id }).from(consultationRuns).where(eq(consultationRuns.id, sourceId));
      if (!source) throw new Error("SOURCE_MISSING");
      await db.update(consultationRuns).set({ processedAt: new Date() }).where(and(eq(consultationRuns.id, sourceId), sql`${consultationRuns.processedAt} IS NULL`));
    } else if (kind === "quotation") {
      const [quote] = await db.select({ id: quotations.id }).from(quotations).where(eq(quotations.id, sourceId));
      if (!quote) throw new Error("SOURCE_MISSING");
    } else if (kind === "reservation") {
      const [event] = await db.select({ id: reservationEvents.id }).from(reservationEvents).where(eq(reservationEvents.id, sourceId));
      if (!event) throw new Error("SOURCE_MISSING");
      await runReservationWorkflow();
    } else if (kind === "notifications") {
      await processOutbox(1, sourceId);
    } else if (kind === "exception") {
      await runExceptionWorkflow();
    } else throw new Error("UNKNOWN_KIND");
    await db.update(businessEvents).set({ status: "completed", processedAt: new Date(), leaseToken: null, leaseUntil: null, errorCode: null })
      .where(and(eq(businessEvents.id, id), eq(businessEvents.leaseToken, leaseToken)));
    return { id, status: "completed", replayed: false };
  } catch {
    const attempts = Number(claimed.attempts);
    await db.transaction(async tx => {
      await tx.update(businessEvents).set({ status: attempts >= maxAttempts ? "dead" : "pending", leaseToken: null, leaseUntil: null, errorCode: "WORKER_FAILED", nextAttemptAt: new Date(Date.now() + Math.min(300000, 1000 * 2 ** attempts)) })
        .where(and(eq(businessEvents.id, id), eq(businessEvents.leaseToken, leaseToken)));
      if (attempts >= maxAttempts && kind !== "exception") await tx.insert(businessEvents).values({ kind: "exception", sourceId: id, correlationId: String(claimed.correlation_id) }).onConflictDoNothing();
    });
    throw new AdminError("WORKER_FAILED", "No se pudo procesar el evento; quedó recuperable o en revisión.", 503);
  }
}
