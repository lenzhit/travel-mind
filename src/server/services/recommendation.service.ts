import { and, cosineDistance, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/server/db";
import { catalogDocuments, destinations, packages, ragChunks } from "@/server/db/schema";
import { embed, EMBEDDING_MODEL, rankPackages } from "@/server/ai/ollama";
import { chunkApprovedContent } from "@/server/ai/chunking";
import type { ChatInput, ChatResult } from "@/features/chat/schemas";
import { validateDepartureDate } from "@/server/providers/mock-travel-provider";
export const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export async function recommend(input: ChatInput): Promise<ChatResult> {
  const message = normalize(input.message);
  const places = await db.select().from(destinations).where(eq(destinations.status, "active"));
  const place = input.destinationId ? places.find(item => item.id === input.destinationId) : places.find(item => message.includes(normalize(item.name)) || message.includes(normalize(item.region)) || normalize(item.name).split(/\W+/).filter(word => word.length >= 5 && !["sagrado", "valle", "canon", "playas", "norte", "cordillera", "blanca"].includes(word)).some(word => message.includes(word)));
  const party = input.travelers ?? Number(message.match(/\b(\d{1,2})\s*(?:personas|viajeros)\b/)?.[1] || 1);
  const travelers = Math.min(20, Math.max(1, party));
  const mentionedBudget = message.match(/(?:usd|\$)\s*(\d+(?:[.,]\d{1,2})?)/)?.[1] ?? message.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:usd|dolares)/)?.[1];
  const budgetMinor = input.budgetMinor ?? (mentionedBudget ? Math.round(Number(mentionedBudget.replace(",", ".")) * 100) : undefined);
  if (input.departureDate) validateDepartureDate(input.departureDate);
  const preferences = { travelers, budgetMinor, departureDate: input.departureDate, destinationId: place?.id };
  const questions = input.departureDate ? [] : ["¿En qué fecha deseas viajar?"];
  const rows = await db.select({ pkg: packages, doc: catalogDocuments, place: destinations.name }).from(packages).innerJoin(destinations, eq(packages.destinationId, destinations.id)).innerJoin(catalogDocuments, eq(catalogDocuments.packageId, packages.id)).where(and(eq(packages.status, "active"), eq(destinations.status, "active"), eq(catalogDocuments.status, "approved"), eq(catalogDocuments.acl, "public"), eq(catalogDocuments.language, "es-PE"), place ? eq(packages.destinationId, place.id) : undefined));
  const avoidTrekking = /(?:sin|no quiero|evitar)\s+(?:hacer\s+)?(?:trekking|caminatas)/.test(message);
  const eligible = rows.filter(({ pkg, doc }) => pkg.currency === "USD" && (budgetMinor === undefined || pkg.basePriceMinor * travelers <= budgetMinor) && (!avoidTrekking || !/\btrek(?:king)?\b|senderismo|caminata|ascenso/i.test(pkg.title + pkg.description + doc.content))).slice(0, 50);
  const requestedUnknown = input.destinationId && !place;
  if (!eligible.length || requestedUnknown) return { message: "No encontré opciones que cumplan tus preferencias. Puedes ajustar el destino o el presupuesto.", recommendations: [], questions, mode: "deterministic", retrieval: "catalog", preferences };
  const chunks = await db.select().from(ragChunks).where(inArray(ragChunks.documentId, eligible.map(row => row.doc.id)));
  let queryVector: number[] | undefined;
  if (chunks.some(chunk => chunk.embeddingModel === EMBEDDING_MODEL && chunk.embedding)) { try { queryVector = await embed(input.message, "query"); } catch { /* deterministic fallback */ } }
  const semanticScores = new Map<string, number>();
  if (queryVector) {
    const distance = cosineDistance(ragChunks.embedding, queryVector);
    const scores = await db.select({ id: ragChunks.id, distance }).from(ragChunks).where(and(inArray(ragChunks.documentId, eligible.map(row => row.doc.id)), eq(ragChunks.embeddingModel, EMBEDDING_MODEL), isNotNull(ragChunks.embedding))).orderBy(distance).limit(100);
    for (const score of scores) semanticScores.set(score.id, 1 - Number(score.distance));
  }
  const stopwords = new Set(["quiero", "viaje", "viajar", "conocer", "visitar", "nuestro", "paquetes", "personas", "viajeros", "para", "como", "unos", "unas", "este", "esta", "presupuesto"]);
  const terms = message.split(/\W+/).filter(term => term.length > 3 && !stopwords.has(term));
  const ranked = eligible.map(row => {
    const pieces = chunks.filter(chunk => chunk.documentId === row.doc.id);
    const fallback = chunkApprovedContent(row.doc.content).map(chunk => ({ ...chunk, id: row.doc.id, embedding: null, embeddingModel: null }));
    const best = (pieces.length ? pieces : fallback).map(chunk => ({ chunk, score: semanticScores.get(chunk.id) ?? terms.filter(term => normalize(chunk.content).includes(term)).length / Math.max(terms.length, 1) })).sort((a, b) => b.score - a.score)[0];
    return { ...row, best, score: best.score };
  }).filter(row => place || row.score > (queryVector ? 0.35 : 0)).sort((a, b) => b.score - a.score || a.pkg.basePriceMinor - b.pkg.basePriceMinor || a.pkg.id.localeCompare(b.pkg.id)).slice(0, 6);
  if (!place && !ranked.some(row => row.score > (queryVector ? 0.35 : 0))) return { message: "¿Qué destino de nuestro catálogo deseas conocer? Puedes explorar los paquetes para elegirlo.", recommendations: [], questions, mode: "deterministic", retrieval: queryVector ? "semantic" : "catalog", preferences };
  let selected = ranked.slice(0, 3);
  let mode: ChatResult["mode"] = "deterministic";
  try { const ids = await rankPackages(input.message, ranked.map(row => ({ id: row.pkg.id, content: row.best.chunk.content }))); selected = ids.map(id => ranked.find(row => row.pkg.id === id)!); mode = "ollama"; } catch { /* validated catalog remains available */ }
  // Recheck publication after model latency: an edited/withdrawn source cannot be returned.
  const current = await db.select({ id: catalogDocuments.id }).from(catalogDocuments).innerJoin(packages, eq(catalogDocuments.packageId, packages.id)).innerJoin(destinations, eq(packages.destinationId, destinations.id)).where(and(inArray(catalogDocuments.id, selected.map(row => row.doc.id)), eq(catalogDocuments.status, "approved"), eq(catalogDocuments.acl, "public"), eq(catalogDocuments.language, "es-PE"), eq(packages.status, "active"), eq(destinations.status, "active")));
  selected = selected.filter(row => current.some(doc => doc.id === row.doc.id));
  if (!selected.length) return { message: "El catálogo cambió durante la búsqueda. Vuelve a consultar para revisar las opciones actualizadas.", recommendations: [], questions, mode, retrieval: queryVector ? "semantic" : "catalog", preferences };
  return { message: `Encontré ${selected.length} ${selected.length === 1 ? "opción" : "opciones"} del catálogo para tu viaje. Las tarifas y los cupos deben reconfirmarse antes de reservar.`, questions, mode, retrieval: queryVector ? "semantic" : "catalog", preferences, recommendations: selected.map(({ pkg, doc, place, best }) => ({ id: pkg.id, title: pkg.title, slug: pkg.slug, destination: place, durationDays: pkg.durationDays, priceMinor: pkg.basePriceMinor, currency: "USD", reason: `${pkg.durationDays} días en ${place}. ${pkg.inclusions.slice(0, 2).join(" · ")}`, sources: [{ id: best.chunk.id, title: pkg.title, uri: doc.sourceUri, version: doc.version, approvedAt: doc.approvedAt.toISOString(), excerpt: best.chunk.content.slice(0, 250) }] })) };
}
