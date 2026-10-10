import { createHash } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { packages, packageVariants, destinations, quotations, quotationVersions } from "@/server/db/schema";
import type { QuoteInput } from "@/features/quotes/schemas";
import { MockTravelProvider } from "@/server/providers/mock-travel-provider";
import { AdminError } from "./admin-errors";
export class QuotationService {
  async issue(sessionId: string, input: QuoteInput, key: string, correlationId: string, now = new Date()) {
    const payloadHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${sessionId}, 0))`);
      const [existing] = await tx.select().from(quotations).where(and(eq(quotations.sessionId, sessionId), eq(quotations.idempotencyKey, key)));
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new AdminError("IDEMPOTENCY_CONFLICT", "Esta solicitud ya se utilizó con otros datos.", 409);
        return existing.id;
      }
      const [amount] = await tx.select({ count: count() }).from(quotations).where(eq(quotations.sessionId, sessionId));
      if (amount.count >= 20) throw new AdminError("QUOTE_LIMIT", "Alcanzaste el límite de cotizaciones de esta sesión.", 429);
      const [pkg] = await tx.select().from(packages).where(and(eq(packages.id, input.packageId), eq(packages.status, "active"))).for("share");
      if (!pkg) throw new AdminError("PACKAGE_NOT_FOUND", "El paquete no está disponible para cotizar.", 404);
      const [destination] = await tx.select().from(destinations).where(and(eq(destinations.id, pkg.destinationId), eq(destinations.status, "active"))).for("share");
      if (!destination) throw new AdminError("PACKAGE_NOT_FOUND", "El destino no está disponible para cotizar.", 404);
      const variants = await tx.select().from(packageVariants).where(eq(packageVariants.packageId, pkg.id)).for("share");
      const snapshot = new MockTravelProvider().quote({ ...pkg, destination, variants }, input, now);
      const [quote] = await tx.insert(quotations).values({ sessionId, issuedAt: now, expiresAt: new Date(now.getTime() + 24 * 3600000), correlationId, idempotencyKey: key, payloadHash }).returning();
      await tx.insert(quotationVersions).values({ quotationId: quote.id, version: 1, snapshot });
      return quote.id;
    });
  }
  async get(sessionId: string, id: string, now = new Date()) {
    return db.transaction(async tx => {
      const [quote] = await tx.select().from(quotations).where(and(eq(quotations.id, id), eq(quotations.sessionId, sessionId))).for("update");
      if (!quote) throw new AdminError("QUOTE_NOT_FOUND", "No se encontró esta cotización en tu sesión.", 404);
      if (quote.status === "issued" && now.getTime() >= quote.expiresAt.getTime()) {
        await tx.update(quotations).set({ status: "expired" }).where(eq(quotations.id, id));
        quote.status = "expired";
      }
      const [version] = await tx.select().from(quotationVersions).where(eq(quotationVersions.quotationId, id)).orderBy(desc(quotationVersions.version)).limit(1);
      if (!version) throw new AdminError("QUOTE_UNAVAILABLE", "No se pudo recuperar el desglose de la cotización.", 503);
      return { id: quote.id, status: quote.status, issuedAt: quote.issuedAt.toISOString(), expiresAt: quote.expiresAt.toISOString(), version: version.version, ...version.snapshot };
    });
  }
}
export const quotationService = new QuotationService();
