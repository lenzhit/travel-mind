import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AdminError } from "@/server/services/admin-errors";
import { adminErrorResponse } from "@/server/services/admin-http";

export async function internalWorkflowHandler(request: NextRequest, operation: () => Promise<unknown>, workflow = "maintenance") {
  const correlationId = crypto.randomUUID();
  const started = performance.now();
  try {
    const expected = process.env.WORKFLOW_INTERNAL_TOKEN;
    const actual = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!expected || expected.length < 32 || !actual || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
      throw new AdminError("UNAUTHENTICATED", "Credencial de servicio inválida.", 401);
    }
    if ((process.env.APP_MODE || "demo") !== "demo") throw new AdminError("DEMO_ONLY", "El procesamiento no está habilitado en este entorno.", 403);
    const data = await operation();
    const n8nExecutionId = request.headers.get("x-correlation-id");
    console.info(JSON.stringify({ event: "workflow_processed", workflow, correlation_id: correlationId, n8n_execution_id: n8nExecutionId && /^\d{1,20}$/.test(n8nExecutionId) ? n8nExecutionId : undefined, duration_ms: Math.round(performance.now() - started), mode: "demo" }));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } });
  } catch (error) { return adminErrorResponse(error, correlationId); }
}
