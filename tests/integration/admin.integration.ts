import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { NextRequest } from "next/server";
import { db, conn } from "@/server/db";
import { adminSessions, auditLogs, catalogDocuments, destinations, packages } from "@/server/db/schema";
import { adminPackageService } from "@/server/services/admin-package.service";
import { retrieveApprovedCatalogDocuments } from "@/server/repositories/catalog-document.repository";
import { login, logout, requireAdmin, tokenHash } from "@/server/services/admin-auth";
import { GET, POST } from "@/app/api/admin/packages/route";
import { PATCH } from "@/app/api/admin/packages/[id]/route";
import { POST as signIn } from "@/app/api/admin/session/route";
import type { AdminPackageInput } from "@/features/admin/schemas";

const destinationId = randomUUID();
const createdIds: string[] = [];
const actor = "local-admin";
const password = "academic-demo-test-only";
const salt = "b".repeat(32);
const input: AdminPackageInput = { destinationId, title: "Paquete de prueba demo", slug: `test-${randomUUID()}`, description: "Descripción ficticia para comprobar administración local.", durationDays: 2, category: "cultural", basePriceMinor: 12345, currency: "USD", inclusions: ["Actividad demo"], exclusions: [], itinerary: [], status: "active" };
const request = (method: string, token?: string, body?: unknown) => new NextRequest("http://localhost:3000/api/admin/packages", { method, headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", ...(token ? { Cookie: `travelmind_admin=${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.endsWith("/travelmind_admin_test")) throw new Error("Se requiere la base local exclusiva de test.");
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  await db.insert(destinations).values({ id: destinationId, name: "Destino demo", slug: `demo-${destinationId}`, region: "Demo", description: "Fixture académico", imageUrl: "/images/demo.jpg" });
});
afterAll(async () => {
  for (const id of createdIds) {
    await db.delete(auditLogs).where(eq(auditLogs.packageId, id));
    await db.delete(catalogDocuments).where(eq(catalogDocuments.packageId, id));
    await db.delete(packages).where(eq(packages.id, id));
  }
  await db.delete(adminSessions);
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
  it("revoca sesiones al salir y rechaza roles ajenos y sesiones vencidas", async () => {
    const token = await login(password);
    expect(await requireAdmin(token)).toBe(actor);
    await logout(token);
    await expect(requireAdmin(token)).rejects.toMatchObject({ status: 401 });
    const other = "c".repeat(64);
    await db.insert(adminSessions).values({ tokenHash: tokenHash(other), actor: "customer-demo", role: "customer", expiresAt: new Date(Date.now() + 60000) });
    await expect(requireAdmin(other)).rejects.toMatchObject({ status: 403 });
    expect((await GET(request("GET", other))).status).toBe(403);
    await db.update(adminSessions).set({ role: "admin", expiresAt: new Date(0) }).where(eq(adminSessions.tokenHash, tokenHash(other)));
    await expect(requireAdmin(other)).rejects.toMatchObject({ status: 401 });
  });
  it("login HTTP usa cookie protegida y rechaza otro origen", async () => {
    const result = await signIn(new NextRequest("https://localhost/api/admin/session", { method: "POST", headers: { Origin: "https://localhost", "Content-Type": "application/json" }, body: JSON.stringify({ password }) }));
    expect(result.status).toBe(200);
    const cookie = result.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie?.toLowerCase()).toContain("samesite=strict");
    const blocked = await signIn(new NextRequest("https://localhost/api/admin/session", { method: "POST", headers: { Origin: "https://example.test", "Content-Type": "application/json" }, body: JSON.stringify({ password }) }));
    expect(blocked.status).toBe(403);
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
