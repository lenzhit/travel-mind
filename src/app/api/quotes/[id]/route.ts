import { NextRequest } from "next/server";
import { z } from "zod";
import { visitorHandler } from "@/server/services/visitor-http";
import { quotationService } from "@/server/services/quotation.service";
import { AdminError } from "@/server/services/admin-errors";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return visitorHandler(request, async sessionId => {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new AdminError("QUOTE_NOT_FOUND", "No se encontró la cotización.", 404);
    return quotationService.get(sessionId, id);
  });
}
