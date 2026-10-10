import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertLocalDemo, requireAdmin, SESSION_COOKIE } from "./admin-auth";
import { AdminError } from "./admin-errors";
export async function adminHandler(request: NextRequest, operation: (actor: string, correlationId: string) => Promise<unknown>, status = 200) {
  const correlationId = crypto.randomUUID();
  try {
    assertLocalDemo(request, request.method !== "GET");
    const actor = await requireAdmin(request.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json({ data: await operation(actor, correlationId) }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return adminErrorResponse(error, correlationId); }
}
export function adminErrorResponse(error: unknown, correlationId = crypto.randomUUID()) {
  const known = error instanceof AdminError;
  return NextResponse.json({ error: { code: known ? error.code : "LOCAL_SERVICE_UNAVAILABLE", message: known ? error.message : "No se pudo completar la operación. Intenta nuevamente.", correlationId } }, { status: known ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}
export async function readAdminBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AdminError("VALIDATION_ERROR", "Se requiere un cuerpo JSON.", 400);
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError("VALIDATION_ERROR", "Falta el cuerpo de la solicitud.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new AdminError("PAYLOAD_TOO_LARGE", "La solicitud excede 64 KiB.", 413); }
    chunks.push(value);
  }
  let raw: unknown;
  try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AdminError("VALIDATION_ERROR", "JSON inválido.", 400); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AdminError("VALIDATION_ERROR", "Revisa los campos del formulario.", 400);
  return parsed.data;
}
