import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db, conn } from "@/server/db";
import { consultationRuns, quotations, visitorSessions } from "@/server/db/schema";
import { createVisitor } from "@/server/services/visitor-session";
import { POST as chat } from "@/app/api/chat/route";
import { runConsultationWorkflow, runQuotationWorkflow } from "@/server/workflows/business";

let visitor: { id: string; token: string };
let quoteId: string;
beforeAll(async () => {
  if (!process.env.DATABASE_URL?.endsWith("/travelmind_admin_test")) throw new Error("Exclusive local test database required");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline fixture")));
  visitor = await createVisitor();
});
afterAll(async () => {
  if (quoteId) await db.delete(quotations).where(eq(quotations.id, quoteId));
  if (visitor) {
    await db.delete(consultationRuns).where(eq(consultationRuns.sessionId, visitor.id));
    await db.delete(visitorSessions).where(eq(visitorSessions.id, visitor.id));
  }
  vi.unstubAllGlobals(); await conn.end();
});

describe("Workflows de consulta y cotización con PostgreSQL real", () => {
  it("registra solo metadatos de consulta y los procesa una vez sin texto personal", async () => {
    const response = await chat(new NextRequest("http://localhost:3000/api/chat", { method: "POST", headers: {
      Origin: "http://localhost:3000", "Content-Type": "application/json", Cookie: `travelmind_visitor=${visitor.token}`,
    }, body: JSON.stringify({ message: "Cusco para dos viajeros" }) }));
    expect(response.status).toBe(200);
    const [run] = await db.select().from(consultationRuns).where(eq(consultationRuns.sessionId, visitor.id));
    expect(run).toMatchObject({ processedAt: null, aiMode: "deterministic" });
    expect(JSON.stringify(run)).not.toContain("Cusco para dos viajeros");
    expect((await runConsultationWorkflow()).processed).toBeGreaterThanOrEqual(1);
    expect((await db.select().from(consultationRuns).where(eq(consultationRuns.id, run.id)))[0].processedAt).not.toBeNull();
    expect((await runConsultationWorkflow()).processed).toBe(0);
  });
  it("vence cotizaciones emitidas sin cambiar una ya vencida", async () => {
    const issuedAt = new Date(Date.now() - 25 * 3600000);
    const [quote] = await db.insert(quotations).values({ sessionId: visitor.id, issuedAt, expiresAt: new Date(issuedAt.getTime() + 24 * 3600000), correlationId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "a".repeat(64) }).returning();
    quoteId = quote.id;
    expect((await runQuotationWorkflow()).expired).toBeGreaterThanOrEqual(1);
    expect((await db.select().from(quotations).where(eq(quotations.id, quote.id)))[0].status).toBe("expired");
    expect((await runQuotationWorkflow()).expired).toBe(0);
  });
});
