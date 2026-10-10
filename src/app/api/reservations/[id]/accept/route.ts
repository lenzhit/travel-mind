import type { NextRequest } from "next/server";
import { customerHandler, readId } from "@/server/services/customer-http";
import { readAdminBody } from "@/server/services/admin-http";
import { acceptanceSchema } from "@/features/reservations/schemas";
import { BookerAgent } from "@/server/ai/booker";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return customerHandler(request, async actor => new BookerAgent(actor.id).accept(readId(id), await readAdminBody(request, acceptanceSchema))); }
