import type { NextRequest } from "next/server";
import { adminHandler, readAdminBody } from "@/server/services/admin-http";
import { readId } from "@/server/services/customer-http";
import { decisionSchema } from "@/features/reservations/schemas";
import { bookingService } from "@/server/services/booking.service";
import { AdminError } from "@/server/services/admin-errors";
import { scheduleBusinessDispatch } from "@/server/workflows/business-events";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return adminHandler(request, async () => { const row = (await bookingService.approvals()).find(item => item.id === readId(id)); if (!row) throw new AdminError("NOT_FOUND", "No se encontró esta aprobación.", 404); return row; }, 200, ["admin", "approver"]); }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return adminHandler(request, async actor => { const reservationId = await bookingService.decide(readId(id), actor, await readAdminBody(request, decisionSchema)); scheduleBusinessDispatch(); return { reservationId }; }, 200, ["admin", "approver"]); }
