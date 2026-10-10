import { eq } from "drizzle-orm";
import { db, conn } from "../src/server/db";
import { customers, customerSessions } from "../src/server/db/schema";
import { env } from "../src/lib/env";
async function main() {
  const [username, role] = process.argv.slice(2);
  if (env.APP_MODE !== "demo" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(env.DATABASE_URL).hostname)) throw new Error("Solo se permite gestionar roles en la base local.");
  if (!username || !/^[a-z0-9_-]{3,32}$/.test(username) || !["customer", "travel_agent", "approver", "admin"].includes(role)) throw new Error("Uso: pnpm account:role <usuario existente> <customer|travel_agent|approver|admin>");
  await db.transaction(async tx => {
    const [account] = await tx.update(customers).set({ role }).where(eq(customers.username, username)).returning({ id: customers.id });
    if (!account) throw new Error("La cuenta no existe. Créala primero desde Mi cuenta.");
    await tx.delete(customerSessions).where(eq(customerSessions.customerId, account.id));
  });
  console.log("Rol actualizado. Ingresa nuevamente desde Mi cuenta.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => conn.end());
