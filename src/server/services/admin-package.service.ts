import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, catalogDocuments, destinations, packages, ragChunks } from "@/server/db/schema";
import { chunkApprovedContent } from "@/server/ai/chunking";
import type { AdminPackageInput } from "@/features/admin/schemas";
import { AdminError } from "./admin-errors";
export function approvedContent(input: AdminPackageInput) {
  return JSON.stringify({ title: input.title, description: input.description, durationDays: input.durationDays, inclusions: input.inclusions, exclusions: input.exclusions, itinerary: input.itinerary });
}
export const adminPackageService = {
  async list(page: number) {
    return db.select().from(packages).orderBy(desc(packages.createdAt), packages.id).limit(20).offset((page - 1) * 20);
  },
  async save(input: AdminPackageInput, actor: string, correlationId: string, id?: string, expectedUpdatedAt?: string) {
    try {
      return await db.transaction(async (tx) => {
        const [destination] = await tx.select({ id: destinations.id }).from(destinations).where(and(eq(destinations.id, input.destinationId), eq(destinations.status, "active"))).limit(1);
        if (!destination) throw new AdminError("INVALID_DESTINATION", "Selecciona un destino activo del catálogo.", 422);
        if (id) {
          const [current] = await tx.select().from(packages).where(eq(packages.id, id)).for("update");
          if (!current) throw new AdminError("NOT_FOUND", "El paquete no existe.", 404);
          if (current.updatedAt.toISOString() !== expectedUpdatedAt) throw new AdminError("EDIT_CONFLICT", "El paquete cambió. Recarga antes de guardar.", 409);
        }
        const updatedAt = new Date(Math.max(Date.now(), expectedUpdatedAt ? new Date(expectedUpdatedAt).getTime() + 1 : 0));
        const [saved] = id ? await tx.update(packages).set({ ...input, updatedAt }).where(eq(packages.id, id)).returning() : await tx.insert(packages).values(input).returning();
        const [previous] = await tx.select().from(catalogDocuments).where(eq(catalogDocuments.packageId, saved.id)).orderBy(desc(catalogDocuments.version)).limit(1);
        await tx.update(catalogDocuments).set({ status: "superseded" }).where(eq(catalogDocuments.packageId, saved.id));
        const content = approvedContent(input);
        const [document] = await tx.insert(catalogDocuments).values({ packageId: saved.id, version: (previous?.version ?? 0) + 1, content, contentHash: createHash("sha256").update(content).digest("hex"), status: input.status === "active" ? "approved" : "withdrawn", approvedBy: actor, sourceUri: `/packages/${saved.id}` }).returning();
        if (input.status === "active") await tx.insert(ragChunks).values(chunkApprovedContent(content).map(chunk => ({ ...chunk, documentId: document.id })));
        await tx.insert(auditLogs).values({ actor, action: id ? (input.status === "archived" ? "package_archived" : "package_updated") : "package_created", packageId: saved.id, correlationId });
        return saved;
      });
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } };
      if (cause.code === "23505" || cause.cause?.code === "23505") throw new AdminError("SLUG_CONFLICT", "El identificador ya pertenece a otro paquete.", 409);
      throw error;
    }
  },
};
