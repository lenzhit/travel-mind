import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { NextRequest } from "next/server";
import { db, conn } from "@/server/db";
import { customers, customerSessions, visitorSessions, auditLogs, catalogDocuments, destinations, packages } from "@/server/db/schema";
import { adminPackageService } from "@/server/services/admin-package.service";
import { retrieveApprovedCatalogDocuments } from "@/server/repositories/catalog-document.repository";
import { tokenHash } from "@/server/services/admin-auth";
import { GET, POST } from "@/app/api/admin/packages/route";
import { PATCH } from "@/app/api/admin/packages/[id]/route";
import { POST as retiredLogin } from "@/app/api/admin/session/route";
import { POST as signIn, GET as accountSession, DELETE as signOut } from "@/app/api/customer/session/route";
import { createVisitor } from "@/server/services/visitor-session";
import { authenticateCustomer } from "@/server/services/customer-auth";
import { GET as approvals } from "@/app/api/admin/approvals/route";
import type { AdminPackageInput } from "@/features/admin/schemas";

const destinationId = randomUUID();
const createdIds: string[] = [];
const actor = randomUUID();
const username = `staff_${actor.slice(0, 8)}`;
const visitors: string[] = [];
async function login(password: string) { const visitor = await createVisitor(); visitors.push(visitor.id); return (await authenticateCustomer({ action: "login", username, password }, visitor.id)).token; }
const password = "academic-demo-test-only";
const salt = "b".repeat(32);
const input: AdminPackageInput = { destinationId, title: "Paquete de prueba demo", slug: `test-${randomUUID()}`, description: "Descripción ficticia para comprobar administración local.", durationDays: 2, category: "cultural", basePriceMinor: 12345, currency: "USD", inclusions: ["Actividad demo"], exclusions: [], itinerary: [], status: "active" };
const request = (method: string, token?: string, body?: unknown) => new NextRequest("http://localhost:3000/api/admin/packages", { method, headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", ...(token ? { Cookie: `travelmind_customer=${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.endsWith("/travelmind_admin_test")) throw new Error("Se requiere la base local exclusiva de test.");
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  await db.insert(customers).values({ id: actor, username, role: "admin", passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}` });
  await db.insert(destinations).values({ id: destinationId, name: "Destino demo", slug: `demo-${destinationId}`, region: "Demo", description: "Fixture académico", imageUrl: "/images/demo.jpg" });
});
afterAll(async () => {
  for (const id of createdIds) {
    await db.delete(auditLogs).where(eq(auditLogs.packageId, id));
    await db.delete(catalogDocuments).where(eq(catalogDocuments.packageId, id));
    await db.delete(packages).where(eq(packages.id, id));
  }
  await db.delete(customerSessions).where(eq(customerSessions.customerId, actor));
  for (const id of visitors) await db.delete(visitorSessions).where(eq(visitorSessions.id, id));
  await db.delete(customers).where(eq(customers.id, actor));
  await db.delete(destinations).where(eq(destinations.id, destinationId));
  await conn.end();
});

describe("Administración con PostgreSQL real", () => {
  it("rechaza invitados en lectura, creación y edición", async () => {
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", undefined, input))).status).toBe(401);
    const result = await PATCH(request("PATCH", undefined, input), { params: Promise.resolve({ id: randomUUID() }) });
    expect(result.status).toBe(401);
    expect((await result.json()).error).toHaveProperty("correlationId");
  });
  it("usa roles actuales, ignora la cookie anterior y revoca la sesión común", async () => {
    const token = await login(password);
    expect((await GET(request("GET", token))).status).toBe(200);
    await db.update(customers).set({ role: "customer" }).where(eq(customers.id, actor));
    expect((await GET(request("GET", token))).status).toBe(403);
    expect((await approvals(request("GET", token))).status).toBe(403);
    await db.update(customers).set({ role: "approver" }).where(eq(customers.id, actor));
    expect((await GET(request("GET", token))).status).toBe(403);
    expect((await approvals(request("GET", token))).status).toBe(200);
    await db.update(customers).set({ role: "admin" }).where(eq(customers.id, actor));
    await signOut(request("DELETE", token));
    expect((await GET(request("GET", token))).status).toBe(401);
    const expired = await login(password);
    await db.update(customerSessions).set({ expiresAt: new Date(0) }).where(eq(customerSessions.tokenHash, tokenHash(expired)));
    expect((await GET(request("GET", expired))).status).toBe(401);
    expect((await GET(new NextRequest("http://localhost:3000/api/admin/packages", { headers: { Cookie: `travelmind_admin=${token}` } }))).status).toBe(401);
  });
  it("login común devuelve el rol con cookie segura y no acepta privilegios del cliente", async () => {
    const visitor = await createVisitor(); visitors.push(visitor.id);
    const makeRequest = (origin: string, extra = {}) => new NextRequest("https://localhost/api/customer/session", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: `travelmind_visitor=${visitor.token}` }, body: JSON.stringify({ action: "login", username, password, ...extra }) });
    const result = await signIn(makeRequest("https://localhost"));
    expect(result.status).toBe(200); expect((await result.json()).data.role).toBe("admin");
    const cookie = result.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("Secure"); expect(cookie?.toLowerCase()).toContain("samesite=strict");
    const session = await accountSession(new NextRequest("https://localhost/api/customer/session", { headers: { Cookie: cookie!.split(";")[0] } }));
    expect((await session.json()).data.role).toBe("admin");
    expect((await signIn(makeRequest("https://example.test"))).status).toBe(403);
    expect((await signIn(makeRequest("https://localhost", { action: "register", role: "admin" }))).status).toBe(400);
    expect((await retiredLogin()).status).toBe(410);
  });
  it("crea por API y registra auditoría y una fuente aprobada sin precios", async () => {
    const token = await login(password);
    const result = await POST(request("POST", token, input));
    expect(result.status).toBe(201);
    const { data } = await result.json(); createdIds.push(data.id);
    expect(data.basePriceMinor).toBe(input.basePriceMinor);
    const docs = await retrieveApprovedCatalogDocuments(data.id);
    expect(docs).toHaveLength(1);
    expect(docs[0].version).toBe(1);
    expect(docs[0].content).not.toContain("basePriceMinor");
    expect(await db.select().from(auditLogs).where(eq(auditLogs.packageId, data.id))).toHaveLength(1);
    expect((await POST(request("POST", token, { ...input, arbitraryRole: "admin" }))).status).toBe(400);
    expect((await POST(request("POST", token, input))).status).toBe(409);
  });
  it("una edición concurrente gana y la anterior queda fuera de recuperación", async () => {
    const id = createdIds[0];
    const [current] = await db.select().from(packages).where(eq(packages.id, id));
    const expected = current.updatedAt.toISOString();
    const results = await Promise.allSettled([
      adminPackageService.save({ ...input, title: "Primera edición demo" }, actor, randomUUID(), id, expected),
      adminPackageService.save({ ...input, title: "Otra edición demo" }, actor, randomUUID(), id, expected),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(result => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason.code).toBe("EDIT_CONFLICT");
    expect((await retrieveApprovedCatalogDocuments(id))[0].version).toBe(2);
    const docs = await db.select().from(catalogDocuments).where(eq(catalogDocuments.packageId, id));
    expect(docs.find(doc => doc.version === 1)?.status).toBe("superseded");
  });
  it("archivar retira el paquete del catálogo y de las fuentes públicas", async () => {
    const id = createdIds[0];
    const [current] = await db.select().from(packages).where(eq(packages.id, id));
    await adminPackageService.save({ ...input, status: "archived" }, actor, randomUUID(), id, current.updatedAt.toISOString());
    expect(await retrieveApprovedCatalogDocuments(id)).toHaveLength(0);
    const { packageRepository } = await import("@/server/repositories/package.repository");
    expect(await packageRepository.findByIdOrSlug(id)).toBeNull();
  });
  it("volver a ejecutar el seed conserva la edición, el archivo y su historial", async () => {
    const id = createdIds[0];
    const [before] = await db.select().from(packages).where(eq(packages.id, id));
    const docsBefore = await db.select().from(catalogDocuments).where(eq(catalogDocuments.packageId, id));
    const { runSeed } = await import("@/server/db/seed");
    await runSeed();
    const [after] = await db.select().from(packages).where(eq(packages.id, id));
    expect(after).toEqual(before);
    expect(await db.select().from(catalogDocuments).where(eq(catalogDocuments.packageId, id))).toEqual(docsBefore);
  });
  it("destino inexistente no deja una creación parcial", async () => {
    await expect(adminPackageService.save({ ...input, slug: `new-${randomUUID()}`, destinationId: randomUUID() }, actor, randomUUID())).rejects.toMatchObject({ code: "INVALID_DESTINATION" });
    expect(await db.select().from(packages).where(eq(packages.destinationId, destinationId))).toHaveLength(1);
  });
});
