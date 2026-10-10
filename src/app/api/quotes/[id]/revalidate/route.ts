import type { NextRequest } from "next/server";
import { customerHandler, readId } from "@/server/services/customer-http";
import { BookerAgent } from "@/server/ai/booker";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return customerHandler(request, async actor => new BookerAgent(actor.id).execute("revalidate_quote", { quotationId: readId(id) })); }
