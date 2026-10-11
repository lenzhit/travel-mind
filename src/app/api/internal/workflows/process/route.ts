import { NextRequest } from "next/server";
import { runMaintenance } from "@/server/workflows/maintenance";
import { internalWorkflowHandler } from "@/server/workflows/internal-auth";
export async function POST(request: NextRequest) {
  return internalWorkflowHandler(request, runMaintenance);
}
