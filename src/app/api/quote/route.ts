import { NextRequest } from "next/server";
import { z } from "zod";
import { quoteInputSchema } from "@/features/quotes/schemas";
import { readAdminBody } from "@/server/services/admin-http";
import { visitorHandler } from "@/server/services/visitor-http";
import { quotationService } from "@/server/services/quotation.service";
import { AdminError } from "@/server/services/admin-errors";
export async function POST(request: NextRequest) {
  return visitorHandler(request, async (sessionId, correlationId) => {
    const key = request.headers.get("idempotency-key");
    if (!key || !z.string().uuid().safeParse(key).success) throw new AdminError("IDEMPOTENCY_KEY_REQUIRED", "La solicitud necesita un identificador válido.", 400);
    const input = await readAdminBody(request, quoteInputSchema);
    const id = await quotationService.issue(sessionId, input, key, correlationId);
    const data = await quotationService.get(sessionId, id);
    console.info(JSON.stringify({ event: "quote_issued", correlation_id: correlationId, quotation_id: id, mode: "demo" }));
    return data;
  }, 201);
}
