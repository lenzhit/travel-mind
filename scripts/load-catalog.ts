import { cpus, totalmem, platform, arch } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

function bound(value: string | undefined, fallback: number, max: number) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`El límite debe estar entre 1 y ${max}.`);
  return n;
}
async function run() {
  const origin = new URL(process.env.LOAD_BASE_URL || "http://127.0.0.1:3000");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) || origin.protocol !== "http:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) throw new Error("Solo se permiten orígenes HTTP de loopback sin credenciales.");
  const requests = bound(process.env.LOAD_REQUESTS, 100, 200);
  const concurrency = bound(process.env.LOAD_CONCURRENCY, 5, 10);
  const health = await fetch(new URL("/api/health", origin), { redirect: "error", signal: AbortSignal.timeout(5000) });
  const state = await health.json();
  if (!health.ok || state.mode !== "demo") throw new Error("Se exige una app local en modo demo.");
  const durations: number[] = [];
  let successes = 0, failures = 0, next = 0;
  async function read() {
    const response = await fetch(new URL("/api/packages?page=1&pageSize=12", origin), { redirect: "error", signal: AbortSignal.timeout(5000) });
    const body = await response.json();
    if (!response.ok || !Array.isArray(body.data) || !body.meta || !body.data.length) throw new Error("El catálogo no devolvió un resultado válido.");
  }
  for (let i = 0; i < 5; i++) await read();
  const started = performance.now();
  await Promise.all(Array.from({ length: Math.min(requests, concurrency) }, async () => {
    while (next++ < requests) {
      const before = performance.now();
      try { await read(); successes++; } catch { failures++; }
      durations.push(performance.now() - before);
    }
  }));
  const elapsedMs = performance.now() - started;
  durations.sort((a, b) => a - b);
  const percentile = (p: number) => Math.round(durations[Math.ceil(durations.length * p) - 1] * 100) / 100;
  const report = { measuredAt: new Date().toISOString(), mode: "demo", endpoint: "/api/packages?page=1&pageSize=12", sampleSize: durations.length, concurrency: Math.min(requests, concurrency), warmupRequests: 5, successes, failures, elapsedMs: Math.round(elapsedMs), p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: percentile(1), hardware: { cpu: cpus()[0]?.model ?? "unknown", logicalCpus: cpus().length, memoryGiB: Math.round(totalmem() / 1024 ** 3), platform: platform(), arch: arch(), node: process.version }, scope: "Lectura local del catálogo; no mide IA, pagos, reservas ni capacidad productiva." };
  await mkdir("docs/testing", { recursive: true });
  const path = resolve("docs/testing/catalog-load-result.json");
  await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  if (failures) process.exitCode = 1;
}
run().catch(error => { console.error(error instanceof Error ? error.message : "Fallo de carga local"); process.exitCode = 1; });
