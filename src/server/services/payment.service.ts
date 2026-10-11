import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { mockInventory, paymentEvents, payments, providerBookingAttempts, reservations } from "@/server/db/schema";
import { mockPaymentProvider, MockPaymentProvider, type MockPaymentEvent } from "@/server/providers/mock-payment-provider";
import { MockTravelProvider } from "@/server/providers/mock-travel-provider";
import { AdminError } from "./admin-errors";
import { changeStatus, ownedReservation, refreshQuote } from "./booking-core";
export class PaymentService {
  constructor(private readonly paymentProvider: MockPaymentProvider = mockPaymentProvider, private readonly travelProvider = new MockTravelProvider()) {}
  async simulate(customerId: string, paymentId: string, outcome: MockPaymentEvent["outcome"]) {
    const [payment] = await db.select({ payment: payments }).from(payments).innerJoin(reservations, eq(payments.reservationId, reservations.id)).where(and(eq(payments.id, paymentId), eq(reservations.customerId, customerId)));
    if (!payment) throw new AdminError("PAYMENT_NOT_FOUND", "No se encontró ese pago en tu cuenta.", 404);
    const sealed = this.paymentProvider.emit(payment.payment, outcome);
    await this.applyEvent(sealed.event, sealed.signature);
    return payment.payment.reservationId;
  }
  async applyEvent(raw: unknown, signature: string, now = new Date()) {
    const event = this.paymentProvider.verify(raw, signature, now.getTime());
    return db.transaction(async tx => {
      const [found] = await tx.select().from(payments).where(eq(payments.id, event.paymentId));
      if (!found) throw new AdminError("PAYMENT_NOT_FOUND", "No se encontró el pago.", 404);
      const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, found.reservationId)).for("update");
      const [payment] = await tx.select().from(payments).where(eq(payments.id, event.paymentId)).for("update");
      if (payment.totalMinor !== event.totalMinor || payment.currency !== event.currency) {
        if (reservation.status === "payment_processing") await changeStatus(tx, reservation, "manual_review", "system", "payment_amount_mismatch");
        return { accepted: false, reservationId: reservation.id };
      }
      const [duplicate] = await tx.select().from(paymentEvents).where(eq(paymentEvents.id, event.id));
      if (duplicate) return { accepted: true, reservationId: reservation.id };
      if (payment.status !== "pending" || reservation.status !== "payment_processing") throw new AdminError("PAYMENT_STATE_CONFLICT", "El pago ya tiene un resultado o necesita revisión.", 409);
      await tx.insert(paymentEvents).values({ id: event.id, paymentId: payment.id, type: event.outcome });
      await tx.update(payments).set({ status: event.outcome }).where(eq(payments.id, payment.id));
      if (event.outcome !== "succeeded") {
        await changeStatus(tx, reservation, "pending_payment", "mock-payment", `payment_${event.outcome}`);
        return { accepted: true, reservationId: reservation.id };
      }
      await changeStatus(tx, reservation, "pending_provider", "mock-payment");
      let failure: string | null = null;
      // Validate before external-provider proof; all effects here remain local and transactional.
      try {
        const quote = await refreshQuote(tx, reservation.customerId, reservation.quotationId, now);
        if (quote.version !== payment.quoteVersion || quote.version !== reservation.quoteVersion) failure = "price_changed_after_payment";
        else if (!quote.available || !quote.inventory) failure = "inventory_unavailable";
        else {
          const proof = this.travelProvider.createBooking(reservation.id);
          if (!proof.isMock || !proof.reference.startsWith("MOCK-")) throw new Error("Invalid provider proof");
          await tx.update(mockInventory).set({ remaining: quote.inventory.remaining - quote.snapshot.travelers }).where(eq(mockInventory.id, quote.inventory.id));
          await tx.insert(providerBookingAttempts).values({ reservationId: reservation.id, providerReference: proof.reference, status: "confirmed_demo" });
          await tx.update(reservations).set({ providerReference: proof.reference }).where(eq(reservations.id, reservation.id));
          await changeStatus(tx, reservation, "confirmed_demo", "mock-travel");
        }
      } catch (error) {
        if (!(error instanceof AdminError)) throw error;
        failure = error.code;
      }
      if (failure) {
        await tx.insert(providerBookingAttempts).values({ reservationId: reservation.id, status: "failed" });
        await tx.update(payments).set({ refundStatus: "pending" }).where(eq(payments.id, payment.id));
        await tx.insert(paymentEvents).values({ id: `refund-${payment.id}`, paymentId: payment.id, type: "refund_requested" });
        await changeStatus(tx, reservation, "refund_pending", "system", failure);
      }
      return { accepted: true, reservationId: reservation.id };
    });
  }
  async reconcileRefund(customerId: string, id: string) {
    return db.transaction(async tx => {
      const reservation = await ownedReservation(tx, customerId, id);
      if (reservation.status !== "refund_pending") return false;
      const verified = await tx.select().from(payments).where(and(eq(payments.reservationId, id), eq(payments.status, "succeeded"))).for("update");
      if (!verified.length || verified.some(payment => payment.refundStatus !== "pending")) throw new AdminError("REFUND_UNVERIFIED", "La resolución necesita revisión manual.", 409);
      const verifiedEvents = await tx.select({ paymentId: paymentEvents.paymentId }).from(paymentEvents).where(and(inArray(paymentEvents.paymentId, verified.map(payment => payment.id)), eq(paymentEvents.type, "succeeded")));
      if (verified.some(payment => !verifiedEvents.some(event => event.paymentId === payment.id))) throw new AdminError("REFUND_UNVERIFIED", "Falta el evento verificado del pago simulado.", 409);
      for (const payment of verified) {
        await tx.update(payments).set({ refundStatus: "refunded" }).where(eq(payments.id, payment.id));
        await tx.insert(paymentEvents).values({ id: `refunded-${payment.id}`, paymentId: payment.id, type: "refund_simulated" }).onConflictDoNothing();
      }
      await changeStatus(tx, reservation, "refunded", "mock-payment");
      return true;
    });
  }
}
export const paymentService = new PaymentService();
