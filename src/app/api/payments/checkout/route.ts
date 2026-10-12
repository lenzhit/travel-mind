import type { NextRequest } from "next/server";
import { customerHandler, readKey } from "@/server/services/customer-http";
import { readAdminBody } from "@/server/services/admin-http";
import { checkoutSchema } from "@/features/reservations/schemas";
import { BookerAgent } from "@/server/ai/booker";
import { scheduleBusinessDispatch } from "@/server/workflows/business-events";
export async function POST(request: NextRequest) { return customerHandler(request, async actor => { const result = await new BookerAgent(actor.id).execute("create_checkout_session", await readAdminBody(request, checkoutSchema), readKey(request)); scheduleBusinessDispatch(); return result; }, 201); }
