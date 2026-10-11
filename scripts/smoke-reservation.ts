// Crea datos ficticios persistentes en la app local de prueba; nunca usa proveedores externos.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const cookies = new Map<string, string>();
async function call<T>(path: string, method = "GET", body?: unknown, key = randomUUID()) {
  const response = await fetch(`${base}${path}`, { method, signal: AbortSignal.timeout(20000), headers: { Host: "localhost:3000", Origin: "http://localhost:3000", "Content-Type": "application/json", "Idempotency-Key": key, Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const cookie of response.headers.getSetCookie()) { const [pair] = cookie.split(";"); const split = pair.indexOf("="); cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
  const result = await response.json();
  assert(response.ok, `${path}: ${result.error?.code || response.status}`);
  return result.data as T;
}
async function run() {
  await call("/api/visitor/session", "POST");
  const username = `qa_${randomUUID().slice(0, 8)}`;
  await call("/api/customer/session", "POST", { action: "register", username, password: "fixture-reserva-local" });
  const result = await call<{ mode: "ollama" | "deterministic"; recommendations: { id: string; priceMinor: number }[] }>("/api/chat", "POST", { message: "Viaje cultural en Perú", travelers: 1, budgetMinor: 200000 });
  if (process.env.EXPECT_AI_MODE) assert.equal(result.mode, process.env.EXPECT_AI_MODE);
  const pkg = result.recommendations.find(item => item.priceMinor <= 200000);
  assert(pkg, "Debe existir una recomendación verificable dentro del umbral");
  const q = await call<{ id: string }>("/api/quote", "POST", { packageId: pkg.id, travelers: 1, departureDate: "2027-06-18" });
  const review = await call<{ version: number; totalMinor: number; available: boolean }>(`/api/quotes/${q.id}/revalidate`, "POST");
  assert(review.available);
  const key = randomUUID();
  const payload = { quotationId: q.id, acceptedVersion: review.version, acceptedTotalMinor: review.totalMinor, termsAccepted: true, travelerName: "Responsable de prueba" };
  const reservation = await call<{ id: string; status: string }>("/api/reserve", "POST", payload, key);
  assert.equal((await call<{ id: string }>("/api/reserve", "POST", payload, key)).id, reservation.id);
  assert.equal(reservation.status, "pending_payment");
  const checkout = await call<{ id: string }>("/api/payments/checkout", "POST", { reservationId: reservation.id });
  const confirmed = await call<{ status: string; providerReference: string }>("/api/payments/mock", "POST", { paymentId: checkout.id, outcome: "succeeded" });
  assert.equal(confirmed.status, "confirmed_demo");
  assert.equal(confirmed.providerReference, `MOCK-${reservation.id}`);
  assert.equal((await call<{ id: string }[]>('/api/reservations')).some(row => row.id === reservation.id), true);
  console.log(JSON.stringify({ event: "local_http_e2e_passed", username, reservationUrl: `/reservations/${reservation.id}`, mode: "demo", aiMode: result.mode }));
}
run().catch(error => { console.error(error instanceof Error ? error.message : "Fallo de prueba local"); process.exitCode = 1; });
