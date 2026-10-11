import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminHandler, readAdminBody } from "@/server/services/admin-http";
import { AdminError } from "@/server/services/admin-errors";
import { retryNotificationSchema } from "@/features/analytics/notification-schemas";
import { retryExhaustedNotification } from "@/server/services/notification-retries";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return adminHandler(request, async (actor, correlationId) => {
    const { id } = await context.params;
    const key = request.headers.get("Idempotency-Key");
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(key).success) throw new AdminError("VALIDATION_ERROR", "Se requiere una entrega y llave de idempotencia válidas.", 400);
    return retryExhaustedNotification(actor, id, await readAdminBody(request, retryNotificationSchema), key!, correlationId);
  });
}
