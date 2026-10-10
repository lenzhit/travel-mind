import { randomBytes, createHash } from "node:crypto";
import { and, count, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { visitorSessions } from "@/server/db/schema";
import { AdminError } from "./admin-errors";
export const VISITOR_COOKIE = "travelmind_visitor";
export const VISITOR_SECONDS = 48 * 3600;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new AdminError("INVALID_ORIGIN", "Origen de solicitud no autorizado.", 403);
}
export async function requireVisitor(token: string | undefined, consume = false) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AdminError("SESSION_REQUIRED", "Inicia una sesión de búsqueda para continuar.", 401);
  return db.transaction(async tx => {
    const now = new Date();
    const [session] = await tx.select().from(visitorSessions).where(and(eq(visitorSessions.tokenHash, hash(token)), gt(visitorSessions.expiresAt, now))).for("update");
    if (!session) throw new AdminError("SESSION_EXPIRED", "Tu sesión terminó. Vuelve a iniciar la búsqueda.", 401);
    if (consume) {
      const reset = now.getTime() - session.windowStartedAt.getTime() >= 60000;
      if (!reset && session.requestCount >= 20) throw new AdminError("RATE_LIMITED", "Espera un minuto antes de continuar.", 429);
      await tx.update(visitorSessions).set({ requestCount: reset ? 1 : session.requestCount + 1, windowStartedAt: reset ? now : session.windowStartedAt }).where(eq(visitorSessions.id, session.id));
    }
    return session.id;
  });
}
export async function createVisitor() {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(78201)`);
    const [recent] = await tx.select({ count: count() }).from(visitorSessions).where(gte(visitorSessions.createdAt, new Date(Date.now() - 60000)));
    if (recent.count >= 30) throw new AdminError("RATE_LIMITED", "La búsqueda está recibiendo muchas solicitudes. Intenta en un minuto.", 429);
    const token = randomBytes(32).toString("hex");
    const [session] = await tx.insert(visitorSessions).values({ tokenHash: hash(token), expiresAt: new Date(Date.now() + VISITOR_SECONDS * 1000) }).returning({ id: visitorSessions.id });
    return { token, id: session.id };
  });
}
