import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { adminSessions } from "@/server/db/schema";
import { AdminError } from "./admin-errors";
export const SESSION_COOKIE = "travelmind_admin";
export const SESSION_SECONDS = 3600;
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
export async function login(password: string) {
  consumeLoginAttempt();
  const configured = process.env.ADMIN_PASSWORD_HASH;
  if (!configured) throw new AdminError("ADMIN_NOT_CONFIGURED", "El acceso administrativo aún no está configurado.", 503);
  if (!verifyPassword(password, configured)) throw new AdminError("INVALID_CREDENTIALS", "Credenciales inválidas.", 401);
  const token = randomBytes(32).toString("hex");
  await db.transaction(async (tx) => {
    await tx.delete(adminSessions).where(eq(adminSessions.actor, "local-admin"));
    await tx.insert(adminSessions).values({ tokenHash: tokenHash(token), actor: "local-admin", role: "admin", expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
  });
  return token;
}
export async function requireAdmin(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AdminError("UNAUTHENTICATED", "Inicia sesión para administrar el catálogo.", 401);
  const [session] = await db.select().from(adminSessions).where(and(eq(adminSessions.tokenHash, tokenHash(token)), gt(adminSessions.expiresAt, new Date()))).limit(1);
  if (!session) throw new AdminError("UNAUTHENTICATED", "La sesión terminó. Ingresa nuevamente.", 401);
  if (session.role !== "admin") throw new AdminError("FORBIDDEN", "No tienes permiso para administrar paquetes.", 403);
  return session.actor;
}
export async function logout(token: string | undefined) {
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token)));
}
