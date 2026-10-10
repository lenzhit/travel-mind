import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runMaintenance } from "@/server/workflows/maintenance";
import { adminErrorResponse } from "@/server/services/admin-http";
import { AdminError } from "@/server/services/admin-errors";
export async function POST(request: NextRequest) {
  try {
    const expected = process.env.WORKFLOW_INTERNAL_TOKEN;
    const actual = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!expected || expected.length < 32 || !actual || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) throw new AdminError("UNAUTHENTICATED", "Credencial de servicio inválida.", 401);
    if ((process.env.APP_MODE || "demo") !== "demo") throw new AdminError("DEMO_ONLY", "El procesamiento no está habilitado en este entorno.", 403);
    return NextResponse.json({ data: await runMaintenance() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return adminErrorResponse(error); }
}
