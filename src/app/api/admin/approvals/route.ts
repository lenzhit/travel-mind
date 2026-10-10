import type { NextRequest } from "next/server";
import { adminHandler } from "@/server/services/admin-http";
import { bookingService } from "@/server/services/booking.service";
export async function GET(request: NextRequest) { return adminHandler(request, async () => bookingService.approvals(), 200, ["admin", "approver"]); }
