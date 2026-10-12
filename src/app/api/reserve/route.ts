import type { NextRequest } from "next/server";
import { customerHandler, readKey } from "@/server/services/customer-http";
import { readAdminBody } from "@/server/services/admin-http";
import { reserveSchema } from "@/features/reservations/schemas";
import { BookerAgent } from "@/server/ai/booker";
import { scheduleBusinessDispatch } from "@/server/workflows/business-events";
export async function POST(request: NextRequest) { return customerHandler(request, async (actor, correlationId) => {
  const result = await new BookerAgent(actor.id).execute("create_reservation_request", await readAdminBody(request, reserveSchema), readKey(request), correlationId);
  scheduleBusinessDispatch();
  return result;
}, 202); }
