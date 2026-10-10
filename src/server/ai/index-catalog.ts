import { and, eq, isNull } from "drizzle-orm";
import { db, conn } from "@/server/db";
import { catalogDocuments, ragChunks } from "@/server/db/schema";
import { chunkApprovedContent } from "./chunking";
import { embed, EMBEDDING_MODEL } from "./ollama";
async function indexCatalog() {
  const docs = await db.select().from(catalogDocuments).where(and(eq(catalogDocuments.status, "approved"), eq(catalogDocuments.acl, "public"), eq(catalogDocuments.language, "es-PE")));
  for (const doc of docs) await db.insert(ragChunks).values(chunkApprovedContent(doc.content).map(chunk => ({ ...chunk, documentId: doc.id }))).onConflictDoNothing();
  let embedded = 0;
  if (process.argv.includes("--embed")) {
    const chunks = await db.select({ id: ragChunks.id, content: ragChunks.content }).from(ragChunks).innerJoin(catalogDocuments, eq(ragChunks.documentId, catalogDocuments.id)).where(and(eq(catalogDocuments.status, "approved"), eq(catalogDocuments.acl, "public"), isNull(ragChunks.embedding)));
    for (const chunk of chunks) {
      try { const embedding = await embed(chunk.content); await db.update(ragChunks).set({ embedding, embeddingModel: EMBEDDING_MODEL }).where(eq(ragChunks.id, chunk.id)); embedded++; }
      catch { console.error("Ollama no disponible: el índice de catálogo sigue operativo."); break; }
    }
  }
  console.log(JSON.stringify({ approvedDocuments: docs.length, embedded, model: EMBEDDING_MODEL }));
}
indexCatalog().catch(() => { console.error("No se pudo indexar el catálogo."); process.exitCode = 1; }).finally(() => conn.end());
