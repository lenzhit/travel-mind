import type { NextRequest } from "next/server";
import { customerHandler } from "@/server/services/customer-http";
import { bookingService } from "@/server/services/booking.service";
export async function GET(request: NextRequest) { return customerHandler(request, async actor => bookingService.list(actor.id)); }
