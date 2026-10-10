import type { NextRequest } from "next/server";
import { adminHandler } from "@/server/services/admin-http";
import { readOperationalMetrics } from "@/server/services/operational-metrics";
export async function GET(request: NextRequest) {
  return adminHandler(request, (_actor, correlationId) => readOperationalMetrics(correlationId));
}

