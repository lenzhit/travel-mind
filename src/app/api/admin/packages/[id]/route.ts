import { NextRequest } from "next/server";
import { z } from "zod";
import { updatePackageSchema } from "@/features/admin/schemas";
import { adminHandler, readAdminBody } from "@/server/services/admin-http";
import { adminPackageService } from "@/server/services/admin-package.service";
import { AdminError } from "@/server/services/admin-errors";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminHandler(request, async (actor, correlationId) => {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new AdminError("VALIDATION_ERROR", "Identificador inválido.", 400);
    const { expectedUpdatedAt, ...input } = await readAdminBody(request, updatePackageSchema);
    return adminPackageService.save(input, actor, correlationId, id, expectedUpdatedAt);
  });
}
