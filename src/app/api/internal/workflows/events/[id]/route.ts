import type { NextRequest } from "next/server";
import { internalWorkflowHandler } from "@/server/workflows/internal-auth";
import { processBusinessEvent } from "@/server/workflows/business-events";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return internalWorkflowHandler(request, () => processBusinessEvent(id), "event");
}
