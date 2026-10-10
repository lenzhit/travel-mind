import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { catalogDocuments, packages } from "@/server/db/schema";

// Base documental para la fase 2. No representa inventario ni precio vigente.
export async function retrieveApprovedCatalogDocuments(packageId: string) {
  return db.select({ id: catalogDocuments.id, version: catalogDocuments.version, content: catalogDocuments.content, sourceUri: catalogDocuments.sourceUri, approvedAt: catalogDocuments.approvedAt })
    .from(catalogDocuments).innerJoin(packages, eq(catalogDocuments.packageId, packages.id))
    .where(and(eq(packages.id, packageId), eq(packages.status, "active"), eq(catalogDocuments.status, "approved"), eq(catalogDocuments.acl, "public"), eq(catalogDocuments.language, "es-PE"))).limit(1);
}
