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
  let passed = 0, ollama = 0, semantic = 0, grounded = 0, ungrounded = 0, budgetViolations = 0, durationMismatches = 0;
  const failedCases: number[] = [];
  for (const [index, example] of recommendationEvaluation.entries()) {
    const started = performance.now();
    const travelers = example.travelers ?? 2;
    const result = await recommend({ message: example.message, travelers, budgetMinor: example.budgetMinor });
    durations.push(Math.round(performance.now() - started));
    const slugs = result.recommendations.map(item => item.slug);
    const relevant = example.expectEmpty ? slugs.length === 0 : !!example.expectedSlug && slugs.includes(example.expectedSlug) && (!example.forbiddenSlug || !slugs.includes(example.forbiddenSlug));
    if (relevant) passed++; else failedCases.push(index + 1);
    if (result.mode === "ollama") ollama++;
    if (result.retrieval === "semantic") semantic++;
    for (const item of result.recommendations) {
      const [stored] = await db.select({ priceMinor: packages.basePriceMinor, durationDays: packages.durationDays, slug: packages.slug, currency: packages.currency }).from(packages).where(eq(packages.id, item.id));
      if (stored?.priceMinor === item.priceMinor && stored.slug === item.slug && stored.currency === item.currency && item.sources.length > 0 && item.sources.every(source => source.uri === `/packages/${item.id}` && source.version > 0)) grounded++; else ungrounded++;
      if (stored?.durationDays !== item.durationDays) durationMismatches++;
      if (example.budgetMinor !== undefined && item.priceMinor * travelers > example.budgetMinor) budgetViolations++;
    }
  }
  const result = { event: "recommendation_evaluation", mode: "demo", cases: recommendationEvaluation.length, passed, failedCases, ollama, semantic, grounded, ungrounded, budgetViolations, durationMismatches, p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), maxMs: Math.max(...durations) };
  console.log(JSON.stringify(result));
  if (passed !== recommendationEvaluation.length || ungrounded || budgetViolations || durationMismatches) process.exitCode = 1;
}
run().catch(() => { console.error("La evaluación local no pudo completarse; revisa PostgreSQL y el catálogo."); process.exitCode = 1; }).finally(() => conn.end());
