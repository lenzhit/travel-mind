import { randomBytes, scryptSync } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { customers, customerSessions, visitorSessions } from "@/server/db/schema";
import { tokenHash, verifyPassword } from "./admin-auth";
import { AdminError } from "./admin-errors";
import type { z } from "zod";
import type { customerAuthSchema } from "@/features/customer/schemas";
export const CUSTOMER_COOKIE = "travelmind_customer";
export const CUSTOMER_SECONDS = 48 * 3600;
const attempts: number[] = [];
export async function authenticateCustomer(input: z.infer<typeof customerAuthSchema>, visitorId: string) {
  const now = Date.now();
  while (attempts.length && attempts[0] <= now - 60000) attempts.shift();
  if (attempts.length >= 10) throw new AdminError("RATE_LIMITED", "Demasiados intentos de acceso. Espera un minuto.", 429);
  attempts.push(now);
  return db.transaction(async tx => {
    const [visitor] = await tx.select().from(visitorSessions).where(and(eq(visitorSessions.id, visitorId), gt(visitorSessions.expiresAt, new Date()))).for("update");
    if (!visitor) throw new AdminError("SESSION_REQUIRED", "Inicia una búsqueda antes de ingresar.", 401);
    let [customer] = await tx.select().from(customers).where(eq(customers.username, input.username));
    if (input.action === "register") {
      if (customer) throw new AdminError("ACCOUNT_EXISTS", "No se pudo crear la cuenta con ese usuario.", 409);
      const salt = randomBytes(16).toString("hex");
      [customer] = await tx.insert(customers).values({ username: input.username, passwordHash: `${salt}:${scryptSync(input.password, salt, 64).toString("hex")}` }).onConflictDoNothing().returning();
      if (!customer) throw new AdminError("ACCOUNT_EXISTS", "No se pudo crear la cuenta con ese usuario.", 409);
    } else {
      const dummy = `${"a".repeat(32)}:${"0".repeat(128)}`;
      if (!verifyPassword(input.password, customer?.passwordHash ?? dummy) || !customer) throw new AdminError("INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.", 401);
    }
    if (visitor.customerId && visitor.customerId !== customer.id) throw new AdminError("SESSION_CONFLICT", "Cierra la sesión actual antes de ingresar con otra cuenta.", 409);
    await tx.update(visitorSessions).set({ customerId: customer.id }).where(eq(visitorSessions.id, visitorId));
    await tx.delete(customerSessions).where(eq(customerSessions.visitorId, visitorId));
    const token = randomBytes(32).toString("hex");
    await tx.insert(customerSessions).values({ tokenHash: tokenHash(token), customerId: customer.id, visitorId, expiresAt: new Date(Math.min(visitor.expiresAt.getTime(), now + CUSTOMER_SECONDS * 1000)) });
    return { token, customer: { id: customer.id, username: customer.username, role: customer.role } };
  });
}
export async function requireAccount(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AdminError("CUSTOMER_REQUIRED", "Ingresa a tu cuenta para gestionar una reserva.", 401);
  const [row] = await db.select({ id: customers.id, username: customers.username, role: customers.role, visitorId: customerSessions.visitorId }).from(customerSessions).innerJoin(customers, eq(customerSessions.customerId, customers.id)).innerJoin(visitorSessions, and(eq(customerSessions.visitorId, visitorSessions.id), eq(visitorSessions.customerId, customers.id))).where(and(eq(customerSessions.tokenHash, tokenHash(token)), gt(customerSessions.expiresAt, new Date()), gt(visitorSessions.expiresAt, new Date())));
  if (!row) throw new AdminError("CUSTOMER_REQUIRED", "Tu sesión terminó. Ingresa nuevamente.", 401);
  return row;
}
export async function requireCustomer(token: string | undefined) {
  const row = await requireAccount(token);
  if (row.role !== "customer") throw new AdminError("FORBIDDEN", "Esta operación requiere una cuenta de cliente.", 403);
  return row;
}
export type CustomerActor = Awaited<ReturnType<typeof requireCustomer>>;
