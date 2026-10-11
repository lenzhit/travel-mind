import type { NextRequest } from "next/server";
import { adminHandler } from "@/server/services/admin-http";
import { AdminError } from "@/server/services/admin-errors";
import { caseQuerySchema } from "@/features/analytics/case-schemas";
import { readOperationCases } from "@/server/services/operation-cases";
export async function GET(request: NextRequest) {
  return adminHandler(request, async actor => {
    const parsed = caseQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) throw new AdminError("VALIDATION_ERROR", "La página solicitada no es válida.", 400);
    return readOperationCases(parsed.data.page, actor);
  }, 200, ["admin", "travel_agent"]);
}
