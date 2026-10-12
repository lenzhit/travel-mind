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
    const result = await recommend({ message: example.message, travelers, budgetMinor: example.budgetMinor, durationDays: example.durationDays });
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
      if (example.durationDays !== undefined && item.durationDays !== example.durationDays) durationMismatches++;
      if (example.budgetMinor !== undefined && item.priceMinor * travelers > example.budgetMinor) budgetViolations++;
    }
  }
  const result = { event: "recommendation_evaluation", mode: "demo", cases: recommendationEvaluation.length, passed, failedCases, ollama, semantic, grounded, ungrounded, budgetViolations, durationMismatches, p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), maxMs: Math.max(...durations) };
  console.log(JSON.stringify(result));
  const concurrentCases = [0, 1, 2, 8, 10, 13].map(index => recommendationEvaluation[index]);
  let cursor = 0;
  const concurrentDurations: number[] = [];
  const concurrentFailures: number[] = [];
  let concurrentGrounded = 0, concurrentFallbacks = 0;
  const rssBefore = process.memoryUsage().rss;
  await Promise.all(Array.from({ length: 2 }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= concurrentCases.length) break;
      const example = concurrentCases[index];
      const started = performance.now();
      try {
        const response = await recommend({ message: example.message, travelers: example.travelers ?? 2, budgetMinor: example.budgetMinor, durationDays: example.durationDays });
        concurrentDurations.push(Math.round(performance.now() - started));
        if (response.mode === "deterministic") concurrentFallbacks++;
        const relevant = example.expectEmpty ? response.recommendations.length === 0 : response.recommendations.some(item => item.slug === example.expectedSlug);
        let groundedCase = true;
        for (const item of response.recommendations) {
          const [stored] = await db.select({ priceMinor: packages.basePriceMinor, durationDays: packages.durationDays, slug: packages.slug }).from(packages).where(eq(packages.id, item.id));
          if (!stored || stored.priceMinor !== item.priceMinor || stored.durationDays !== item.durationDays || stored.slug !== item.slug || !item.sources.length || (example.budgetMinor !== undefined && item.priceMinor * (example.travelers ?? 2) > example.budgetMinor)) groundedCase = false;
        }
        if (groundedCase) concurrentGrounded++;
        if (!relevant || !groundedCase) concurrentFailures.push(index + 1);
      } catch { concurrentFailures.push(index + 1); }
    }
  }));
  console.log(JSON.stringify({ event: "recommendation_concurrent_evaluation", mode: "demo", concurrency: 2, cases: concurrentCases.length, passed: concurrentCases.length - concurrentFailures.length, failedCases: concurrentFailures, groundedCases: concurrentGrounded, fallbacks: concurrentFallbacks, p50Ms: percentile(concurrentDurations, 0.5), p95Ms: percentile(concurrentDurations, 0.95), maxMs: Math.max(...concurrentDurations), nodeRssDeltaMiB: Math.round((process.memoryUsage().rss - rssBefore) / 1048576) }));
  if (passed !== recommendationEvaluation.length || ungrounded || budgetViolations || durationMismatches) process.exitCode = 1;
  if (concurrentFailures.length) process.exitCode = 1;
}
run().catch(() => { console.error("La evaluación local no pudo completarse; revisa PostgreSQL y el catálogo."); process.exitCode = 1; }).finally(() => conn.end());
