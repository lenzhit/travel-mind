import { z } from "zod";
export async function sendMailpit(recipient: string, body: string, eventId: string) {
  if ((process.env.APP_MODE || "demo") !== "demo" || (process.env.EMAIL_PROVIDER || "mailpit") !== "mailpit" || !/^[a-z0-9_-]{3,32}@example\.test$/.test(recipient)) throw new Error("Local mail only");
  const url = new URL(process.env.MAILPIT_WEB_URL || "http://localhost:8025");
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]", "mailpit"].includes(url.hostname) || url.username || url.password) throw new Error("Local mail only");
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  const response = await fetch(new URL("/api/v1/send", url), { method: "POST", redirect: "error", signal: AbortSignal.timeout(2000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ From: { Email: "travelmind@example.test", Name: "TravelMind" }, To: [{ Email: recipient }], Subject: "Actualización de tu solicitud de viaje (prueba)", Text: body, Tags: ["travelmind", "simulation"], MessageID: `${eventId}@travelmind.example.test` }) });
  if (!response.ok) throw new Error("Mailpit unavailable");
  const result = z.object({ ID: z.string().max(100) }).parse(await response.json());
  return result.ID;
}
