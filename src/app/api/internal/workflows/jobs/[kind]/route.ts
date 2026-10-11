import { NextRequest } from "next/server";
import { AdminError } from "@/server/services/admin-errors";
import { workflowHandlers } from "@/server/workflows/business";
import { internalWorkflowHandler } from "@/server/workflows/internal-auth";

export async function POST(request: NextRequest, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  return internalWorkflowHandler(request, async () => {
    if (!Object.hasOwn(workflowHandlers, kind)) throw new AdminError("WORKFLOW_NOT_FOUND", "No se encontró este flujo interno.", 404);
    return workflowHandlers[kind as keyof typeof workflowHandlers]();
  }, kind);
}
