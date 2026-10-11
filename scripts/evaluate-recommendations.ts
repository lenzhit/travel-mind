import { eq } from "drizzle-orm";
import { db, conn } from "../src/server/db";
import { packages } from "../src/server/db/schema";
import { recommend } from "../src/server/services/recommendation.service";
import { recommendationEvaluation } from "../tests/fixtures/recommendation-evaluation";

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

async function run() {
  if ((process.env.APP_MODE || "demo") !== "demo") throw new Error("La evaluación requiere APP_MODE=demo.");
  const durations: number[] = [];
  let passed = 0, ollama = 0, semantic = 0, grounded = 0;
  for (const example of recommendationEvaluation) {
    const started = performance.now();
    const result = await recommend({ message: example.message, travelers: 2 });
    durations.push(Math.round(performance.now() - started));
    const slugs = result.recommendations.map(item => item.slug);
    if (slugs.includes(example.expectedSlug) && (!example.forbiddenSlug || !slugs.includes(example.forbiddenSlug))) passed++;
    if (result.mode === "ollama") ollama++;
    if (result.retrieval === "semantic") semantic++;
    for (const item of result.recommendations) {
      const [stored] = await db.select({ priceMinor: packages.basePriceMinor }).from(packages).where(eq(packages.id, item.id));
      if (stored?.priceMinor === item.priceMinor && item.sources.length > 0 && item.sources.every(source => source.uri === `/packages/${item.id}` && source.version > 0)) grounded++;
    }
  }
  const result = { event: "recommendation_evaluation", mode: "demo", cases: recommendationEvaluation.length, passed, ollama, semantic, grounded, p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), maxMs: Math.max(...durations) };
  console.log(JSON.stringify(result));
  if (passed !== recommendationEvaluation.length) process.exitCode = 1;
}
run().catch(() => { console.error("La evaluación local no pudo completarse; revisa PostgreSQL y el catálogo."); process.exitCode = 1; }).finally(() => conn.end());
