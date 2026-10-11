import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminHandler, readAdminBody } from "@/server/services/admin-http";
import { AdminError } from "@/server/services/admin-errors";
import { caseActionSchema } from "@/features/analytics/case-schemas";
import { actOnCase } from "@/server/services/case-actions";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return adminHandler(request, async (actor, correlationId) => {
    const { id } = await context.params;
    const key = request.headers.get("Idempotency-Key");
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(key).success) throw new AdminError("VALIDATION_ERROR", "Se requiere una solicitud y llave de idempotencia válidas.", 400);
    return actOnCase(actor, id, await readAdminBody(request, caseActionSchema), key!, correlationId);
  }, 200, ["admin", "travel_agent"]);
}
