import type { NextRequest } from "next/server";
import { customerHandler } from "@/server/services/customer-http";
import { readAdminBody } from "@/server/services/admin-http";
import { mockPaymentSchema } from "@/features/reservations/schemas";
import { paymentService } from "@/server/services/payment.service";
import { bookingService } from "@/server/services/booking.service";
export async function POST(request: NextRequest) { return customerHandler(request, async actor => { const input = await readAdminBody(request, mockPaymentSchema); const id = await paymentService.simulate(actor.id, input.paymentId, input.outcome); return bookingService.get(actor.id, id); }); }
