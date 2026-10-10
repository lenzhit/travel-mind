import { and, eq, lte } from "drizzle-orm";
import { db, conn } from "./index";
import { quotations } from "./schema";
db.update(quotations).set({ status: "expired" }).where(and(eq(quotations.status, "issued"), lte(quotations.expiresAt, new Date()))).returning({ id: quotations.id }).then(rows => console.log(JSON.stringify({ event: "quote_expired", count: rows.length, mode: "demo" }))).catch(() => { console.error("No se pudo actualizar el vencimiento de cotizaciones."); process.exitCode = 1; }).finally(() => conn.end());
