import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, conn } from "./index";
import { catalogDocuments, packages, ragChunks } from "./schema";
import { chunkApprovedContent } from "@/server/ai/chunking";
import { approvedContent } from "@/server/services/admin-package.service";
import { adminPackageSchema } from "@/features/admin/schemas";

export async function publishDemoCatalog() {
  const url = new URL(process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/travelmind");
  if ((process.env.APP_MODE || "demo") !== "demo" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Publicación permitida solo en la base local de demo.");
  const rows = await db.select({ id: packages.id }).from(packages).where(eq(packages.status, "active"));
  for (const { id } of rows) {
    await db.transaction(async tx => {
      const [row] = await tx.select().from(packages).where(eq(packages.id, id)).for("update");
      if (row.status !== "active") return;
      const [existing] = await tx.select({ id: catalogDocuments.id }).from(catalogDocuments).where(eq(catalogDocuments.packageId, id)).limit(1);
      if (existing) return;
      const input = adminPackageSchema.parse({ destinationId: row.destinationId, title: row.title, slug: row.slug, description: row.description, durationDays: row.durationDays, category: row.category, basePriceMinor: row.basePriceMinor, currency: row.currency, inclusions: row.inclusions, exclusions: row.exclusions, itinerary: row.itinerary, status: row.status });
      const content = approvedContent(input);
      const [document] = await tx.insert(catalogDocuments).values({ packageId: id, version: 1, content, contentHash: createHash("sha256").update(content).digest("hex"), status: "approved", approvedBy: "demo-catalog-bootstrap", sourceUri: `/packages/${id}` }).returning();
      await tx.insert(ragChunks).values(chunkApprovedContent(content).map(chunk => ({ ...chunk, documentId: document.id })));
    });
  }
}
if (process.argv[1]?.endsWith("publish-demo-catalog.ts")) {
  publishDemoCatalog().then(() => console.log("Contenido demo aprobado y versionado.")).catch(() => { console.error("No se pudo publicar el catálogo demo. Revisa la base local y las migraciones."); process.exitCode = 1; }).finally(() => conn.end());
}
