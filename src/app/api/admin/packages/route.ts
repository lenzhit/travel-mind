import { NextRequest } from "next/server";
import { z } from "zod";
import { adminPackageSchema } from "@/features/admin/schemas";
import { adminHandler, readAdminBody } from "@/server/services/admin-http";
import { adminPackageService } from "@/server/services/admin-package.service";
import { AdminError } from "@/server/services/admin-errors";
export async function GET(request: NextRequest) {
  return adminHandler(request, async () => {
    const parsed = z.coerce.number().int().min(1).max(10000).safeParse(request.nextUrl.searchParams.get("page") ?? 1);
    if (!parsed.success) throw new AdminError("VALIDATION_ERROR", "Página inválida.", 400);
    return adminPackageService.list(parsed.data);
  });
}
export async function POST(request: NextRequest) {
  return adminHandler(request, async (actor, correlationId) => adminPackageService.save(await readAdminBody(request, adminPackageSchema), actor, correlationId), 201);
}
