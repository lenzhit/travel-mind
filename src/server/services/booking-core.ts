import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { approvalRequests, destinations, mockInventory, packages, packageVariants, quotations, quotationVersions, reservationEvents, reservations, visitorSessions, workflowOutbox, type QuoteSnapshot } from "@/server/db/schema";
import { MockTravelProvider } from "@/server/providers/mock-travel-provider";
import { AdminError } from "./admin-errors";
export type BookingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type ReservationRow = typeof reservations.$inferSelect;
export async function ownedReservation(tx: BookingTx, customerId: string, id: string) {
  const [row] = await tx.select().from(reservations).where(and(eq(reservations.id, id), eq(reservations.customerId, customerId))).for("update");
  if (!row) throw new AdminError("RESERVATION_NOT_FOUND", "No se encontró esta reserva en tu cuenta.", 404);
  return row;
}
export async function refreshQuote(tx: BookingTx, customerId: string, id: string, now: Date) {
  const [quote] = await tx.select().from(quotations).where(eq(quotations.id, id)).for("update");
  const [owner] = quote ? await tx.select().from(visitorSessions).where(and(eq(visitorSessions.id, quote.sessionId), eq(visitorSessions.customerId, customerId))) : [];
  if (!quote || !owner) throw new AdminError("QUOTE_NOT_FOUND", "No se encontró esta cotización en tu cuenta.", 404);
  if (quote.status !== "issued" || now >= quote.expiresAt) throw new AdminError("QUOTE_EXPIRED", "La cotización venció. Solicita una nueva antes de reservar.", 422);
  const [previous] = await tx.select().from(quotationVersions).where(eq(quotationVersions.quotationId, id)).orderBy(desc(quotationVersions.version)).limit(1);
  if (!previous) throw new AdminError("QUOTE_UNAVAILABLE", "No se encontró el desglose de la cotización.", 503);
  const input = { packageId: previous.snapshot.packageId, travelers: previous.snapshot.travelers, departureDate: previous.snapshot.departureDate, ...(previous.snapshot.variantId ? { variantId: previous.snapshot.variantId } : {}) };
  const [pkg] = await tx.select().from(packages).where(and(eq(packages.id, input.packageId), eq(packages.status, "active"))).for("share");
  const [destination] = pkg ? await tx.select().from(destinations).where(and(eq(destinations.id, pkg.destinationId), eq(destinations.status, "active"))).for("share") : [];
  if (!pkg || !destination) throw new AdminError("PACKAGE_UNAVAILABLE", "El paquete requiere revisión antes de reservar.", 422);
  const variants = await tx.select().from(packageVariants).where(eq(packageVariants.packageId, pkg.id)).for("share");
  const snapshot = new MockTravelProvider().quote({ ...pkg, destination, variants }, input, now);
  const changed = (Object.keys(snapshot) as (keyof QuoteSnapshot)[]).some(key => JSON.stringify(snapshot[key]) !== JSON.stringify(previous.snapshot[key]));
  const version = previous.version + (changed ? 1 : 0);
  if (changed) {
    await tx.update(quotationVersions).set({ status: "superseded" }).where(eq(quotationVersions.quotationId, id));
    await tx.insert(quotationVersions).values({ quotationId: id, version, snapshot });
  }
  // Own mock inventory policy: one shared departure pool, sourced from catalog capacities.
  const capacities = variants.filter(item => item.status === "active").map(item => item.capacity);
  const capacity = capacities.length ? Math.max(...capacities) : 0;
  if (capacity > 0) await tx.insert(mockInventory).values({ packageId: pkg.id, departureDate: input.departureDate, capacity, remaining: capacity }).onConflictDoNothing();
  const [inventory] = await tx.select().from(mockInventory).where(and(eq(mockInventory.packageId, pkg.id), eq(mockInventory.departureDate, input.departureDate))).for("update");
  const available = Boolean(inventory && inventory.remaining >= input.travelers);
  return { quote, snapshot, version, changed, available, inventory };
}
export async function recordReservationEvent(tx: BookingTx, reservation: ReservationRow, event: string, actor: string) {
  const [previous] = await tx.select({ createdAt: reservationEvents.createdAt }).from(reservationEvents).where(eq(reservationEvents.reservationId, reservation.id)).orderBy(desc(reservationEvents.createdAt)).limit(1);
  const createdAt = new Date(Math.max(Date.now(), previous ? previous.createdAt.getTime() + 1 : 0));
  const [row] = await tx.insert(reservationEvents).values({ reservationId: reservation.id, event, actor, correlationId: reservation.correlationId, createdAt }).returning();
  await tx.insert(workflowOutbox).values({ reservationId: reservation.id, eventId: row.id, createdAt });
}
export async function changeStatus(tx: BookingTx, reservation: ReservationRow, status: string, actor: string, reason: string | null = null) {
  const [saved] = await tx.update(reservations).set({ status, reason, updatedAt: new Date() }).where(and(eq(reservations.id, reservation.id), eq(reservations.status, reservation.status))).returning();
  if (!saved) throw new AdminError("STATE_CONFLICT", "El estado cambió. Recarga antes de continuar.", 409);
  Object.assign(reservation, saved);
  await recordReservationEvent(tx, reservation, status, actor);
}
export async function createApproval(tx: BookingTx, reservation: ReservationRow, quoteExpiresAt: Date, now: Date) {
  await tx.insert(approvalRequests).values({ reservationId: reservation.id, quoteVersion: reservation.quoteVersion, expiresAt: new Date(Math.min(quoteExpiresAt.getTime(), now.getTime() + 3600000)) });
}
export async function expirePendingApprovals(tx: BookingTx, reservationId: string) {
  await tx.update(approvalRequests).set({ status: "expired" }).where(and(eq(approvalRequests.reservationId, reservationId), eq(approvalRequests.status, "pending")));
}
