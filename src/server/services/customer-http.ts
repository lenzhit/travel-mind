import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_COOKIE, requireCustomer, type CustomerActor } from "./customer-auth";
import { assertOrigin, requireVisitor, VISITOR_COOKIE } from "./visitor-session";
import { AdminError } from "./admin-errors";
import { adminErrorResponse } from "./admin-http";
export function readId(value: string) { if (!z.string().uuid().safeParse(value).success) throw new AdminError("NOT_FOUND", "No se encontró el recurso.", 404); return value; }
export function readKey(request: Request) { const key = request.headers.get("idempotency-key"); if (!key || !z.string().uuid().safeParse(key).success) throw new AdminError("IDEMPOTENCY_KEY_REQUIRED", "La solicitud necesita un identificador válido.", 400); return key; }
export async function customerHandler(request: NextRequest, operation: (actor: CustomerActor, correlationId: string) => Promise<unknown>, status = 200) {
  const correlationId = crypto.randomUUID();
  try {
    const mutation = request.method !== "GET";
    if (mutation) assertOrigin(request);
    const actor = await requireCustomer(request.cookies.get(CUSTOMER_COOKIE)?.value);
    const visitorId = await requireVisitor(request.cookies.get(VISITOR_COOKIE)?.value, mutation);
    if (visitorId !== actor.visitorId) throw new AdminError("CUSTOMER_REQUIRED", "La sesión de búsqueda no coincide con tu cuenta.", 401);
    return NextResponse.json({ data: await operation(actor, correlationId) }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return adminErrorResponse(error, correlationId); }
}
