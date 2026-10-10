import type { NextRequest } from "next/server";
import { customerHandler, readKey } from "@/server/services/customer-http";
import { readAdminBody } from "@/server/services/admin-http";
import { checkoutSchema } from "@/features/reservations/schemas";
import { BookerAgent } from "@/server/ai/booker";
export async function POST(request: NextRequest) { return customerHandler(request, async actor => new BookerAgent(actor.id).execute("create_checkout_session", await readAdminBody(request, checkoutSchema), readKey(request)), 201); }
