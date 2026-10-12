import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db, conn } from "@/server/db";
import { businessEvents, consultationRuns, visitorSessions } from "@/server/db/schema";
import { createVisitor } from "@/server/services/visitor-session";
import { processBusinessEvent, quarantineExpiredLeases } from "@/server/workflows/business-events";

const sources: string[] = [];
const sessions: string[] = [];

afterAll(async () => {
  if (sources.length) await db.delete(businessEvents).where(inArray(businessEvents.sourceId, sources));
  if (sources.length) await db.delete(businessEvents).where(inArray(businessEvents.id, sources));
  if (sources.length) await db.delete(consultationRuns).where(inArray(consultationRuns.id, sources));
  if (sessions.length) await db.delete(visitorSessions).where(inArray(visitorSessions.id, sessions));
  await conn.end();
});

describe("Entrega durable de eventos", () => {
  it("registra la consulta en la misma transacción y procesa un replay una sola vez", async () => {
    const visitor = await createVisitor(); sessions.push(visitor.id);
    const sourceId = randomUUID(); sources.push(sourceId);
    await db.insert(consultationRuns).values({ id: sourceId, sessionId: visitor.id, correlationId: randomUUID(), aiMode: "deterministic", retrievalMode: "catalog", recommendationCount: 1 });
    const [event] = await db.select().from(businessEvents).where(and(eq(businessEvents.kind, "consultation"), eq(businessEvents.sourceId, sourceId)));
    sources.push(event.id);
    expect(event.status).toBe("pending");
    const results = await Promise.all([processBusinessEvent(event.id), processBusinessEvent(event.id)]);
    expect(results.filter(row => row.replayed === false)).toHaveLength(1);
    expect((await db.select().from(businessEvents).where(eq(businessEvents.id, event.id)))[0]).toMatchObject({ status: "completed", attempts: 1 });
    expect((await db.select().from(consultationRuns).where(eq(consultationRuns.id, sourceId)))[0].processedAt).toBeInstanceOf(Date);
    expect(await processBusinessEvent(event.id)).toMatchObject({ status: "completed", replayed: true });
  });

  it("recupera una entrega interrumpida cuando vence el lease persistido", async () => {
    const visitor = await createVisitor(); sessions.push(visitor.id);
    const sourceId = randomUUID(); sources.push(sourceId);
    await db.insert(consultationRuns).values({ id: sourceId, sessionId: visitor.id, correlationId: randomUUID(), aiMode: "deterministic", retrievalMode: "catalog", recommendationCount: 1 });
    const [event] = await db.select().from(businessEvents).where(and(eq(businessEvents.kind, "consultation"), eq(businessEvents.sourceId, sourceId)));
    sources.push(event.id);
    await db.update(businessEvents).set({ status: "processing", attempts: 1, leaseToken: randomUUID(), leaseUntil: new Date(Date.now() - 1000) }).where(eq(businessEvents.id, event.id));
    expect(await processBusinessEvent(event.id)).toMatchObject({ status: "completed", replayed: false });
    expect((await db.select().from(businessEvents).where(eq(businessEvents.id, event.id)))[0]).toMatchObject({ status: "completed", attempts: 2, leaseToken: null });
  });

  it("agota fallos del worker y abre un evento de excepción sin confirmar una operación", async () => {
    const sourceId = randomUUID(); sources.push(sourceId);
    const [event] = await db.insert(businessEvents).values({ kind: "quotation", sourceId, correlationId: randomUUID() }).returning();
    sources.push(event.id);
    for (let attempt = 0; attempt < 4; attempt++) await expect(processBusinessEvent(event.id)).rejects.toMatchObject({ code: "WORKER_FAILED" });
    const [failed] = await db.select().from(businessEvents).where(eq(businessEvents.id, event.id));
    expect(failed).toMatchObject({ status: "dead", attempts: 4, errorCode: "WORKER_FAILED" });
    const [exception] = await db.select().from(businessEvents).where(and(eq(businessEvents.kind, "exception"), eq(businessEvents.sourceId, event.id)));
    expect(exception.status).toBe("pending");
    expect(await processBusinessEvent(event.id)).toMatchObject({ status: "dead", replayed: true });
  });

  it("pone en revisión un último intento interrumpido al vencer su lease", async () => {
    const sourceId = randomUUID(); sources.push(sourceId);
    const [event] = await db.insert(businessEvents).values({ kind: "quotation", sourceId, correlationId: randomUUID(), status: "processing", attempts: 4, leaseToken: randomUUID(), leaseUntil: new Date(Date.now() - 1000) }).returning();
    sources.push(event.id);
    expect(await quarantineExpiredLeases()).toBe(1);
    expect(await quarantineExpiredLeases()).toBe(0);
    expect((await db.select().from(businessEvents).where(eq(businessEvents.id, event.id)))[0]).toMatchObject({ status: "dead", attempts: 4, errorCode: "LEASE_EXHAUSTED", leaseToken: null });
    expect(await db.select().from(businessEvents).where(and(eq(businessEvents.kind, "exception"), eq(businessEvents.sourceId, event.id)))).toHaveLength(1);
  });
});
