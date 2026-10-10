import { createHash } from "node:crypto";
export const PIPELINE_VERSION = "catalog-v1";
export function chunkApprovedContent(content: string) {
  // JSON remains data; no recovered content is placed in system instructions.
  const parsed = JSON.parse(content) as { title: string; description: string; durationDays: number; inclusions: string[]; exclusions: string[]; itinerary: { day: number; title: string; description: string }[] };
  const text = `${parsed.title}\n${parsed.description}\nDuración: ${parsed.durationDays} días.\nIncluye: ${parsed.inclusions.join("; ")}.\nNo incluye: ${parsed.exclusions.join("; ")}.\n${parsed.itinerary.map(day => `Día ${day.day}: ${day.title}. ${day.description}`).join("\n")}`;
  const chunks = [];
  for (let start = 0; start < text.length; start += 850) {
    const piece = text.slice(start, start + 1000);
    chunks.push({ ordinal: chunks.length, content: piece, contentHash: createHash("sha256").update(piece).digest("hex"), pipelineVersion: PIPELINE_VERSION });
    if (start + 1000 >= text.length) break;
  }
  return chunks;
}
