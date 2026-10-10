import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AdminError } from "@/server/services/admin-errors";
const localKey = randomBytes(32).toString("hex");
const eventSchema = z.object({ id: z.string().max(100), paymentId: z.string().uuid(), totalMinor: z.number().int().nonnegative(), currency: z.literal("USD"), outcome: z.enum(["succeeded", "failed", "cancelled"]), provider: z.literal("mock"), simulated: z.literal(true), livemode: z.literal(false), issuedAt: z.number().int() }).strict();
export type MockPaymentEvent = z.infer<typeof eventSchema>;
export class MockPaymentProvider {
  readonly name = "mock";
  readonly isMock = true;
  constructor(private readonly key = localKey) {}
  emit(payment: { id: string; totalMinor: number; currency: string }, outcome: MockPaymentEvent["outcome"], now = Date.now()) {
    if ((process.env.APP_MODE || "demo") !== "demo" || (process.env.PAYMENT_PROVIDER || "mock") !== "mock") throw new AdminError("PAYMENT_UNAVAILABLE", "El pago de prueba no está habilitado.", 503);
    const event = eventSchema.parse({ id: `mock-${payment.id}-${outcome}`, paymentId: payment.id, totalMinor: payment.totalMinor, currency: payment.currency, outcome, provider: "mock", simulated: true, livemode: false, issuedAt: now });
    return { event, signature: this.sign(event) };
  }
  private sign(event: MockPaymentEvent) { return createHmac("sha256", this.key).update(JSON.stringify(event)).digest("hex"); }
  verify(raw: unknown, signature: string, now = Date.now()) {
    const result = eventSchema.safeParse(raw);
    if (!result.success || !/^[a-f0-9]{64}$/.test(signature)) throw new AdminError("INVALID_PAYMENT_EVENT", "El evento de pago no es válido.", 403);
    const event = result.data;
    if (Math.abs(now - event.issuedAt) > 300000 || !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(this.sign(event), "hex"))) throw new AdminError("INVALID_PAYMENT_EVENT", "El evento de pago no es válido.", 403);
    return event;
  }
}
export const mockPaymentProvider = new MockPaymentProvider();
