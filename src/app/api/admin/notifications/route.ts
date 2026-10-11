import type { NextRequest } from "next/server";
import { adminHandler } from "@/server/services/admin-http";
import { listExhaustedNotifications } from "@/server/services/notification-retries";

export async function GET(request: NextRequest) {
  return adminHandler(request, async () => listExhaustedNotifications());
}
