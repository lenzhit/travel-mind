import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { AdminError } from "./admin-errors";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function verifyPassword(password: string, encoded: string): boolean {
  const [salt, hash] = encoded.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, "hex"));
}
// Límite global del proceso local: no confía en cabeceras IP del cliente.
const attempts: number[] = [];
export function consumeLoginAttempt(now = Date.now()) {
  while (attempts.length && attempts[0] <= now - 60000) attempts.shift();
  if (attempts.length >= 10) throw new AdminError("RATE_LIMITED", "Demasiados intentos. Espera un minuto.", 429);
  attempts.push(now);
}
export function assertLocalDemo(request: Request, mutation = false) {
  const url = new URL(request.url);
  if ((process.env.APP_MODE || "demo") !== "demo" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new AdminError("DEMO_ONLY", "El acceso administrativo no está habilitado para este entorno.", 403);
  if (mutation && request.headers.get("origin") !== url.origin) throw new AdminError("INVALID_ORIGIN", "Origen de solicitud no autorizado.", 403);
}
