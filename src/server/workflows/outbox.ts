import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { customers, notificationDeliveries, reservationEvents, reservations, workflowOutbox } from "@/server/db/schema";
import { sendMailpit } from "@/server/providers/mailpit-provider";
import { SIMULATION_NOTICE } from "@/features/reservations/schemas";
export async function processOutbox(limit = 10) {
  const tasks = await db.select({ id: workflowOutbox.id }).from(workflowOutbox).where(eq(workflowOutbox.status, "pending")).orderBy(workflowOutbox.createdAt).limit(Math.min(10, Math.max(1, limit)));
  let completed = 0;
  for (const task of tasks) await db.transaction(async tx => {
    const [locked] = await tx.select().from(workflowOutbox).where(and(eq(workflowOutbox.id, task.id), eq(workflowOutbox.status, "pending"))).for("update", { skipLocked: true });
    if (!locked) return;
    const [event] = await tx.select().from(reservationEvents).where(eq(reservationEvents.id, locked.eventId));
    const [account] = await tx.select({ username: customers.username }).from(reservations).innerJoin(customers, eq(customers.id, reservations.customerId)).where(eq(reservations.id, locked.reservationId));
    const labels: Record<string, string> = { reservation_requested: "Solicitud recibida", pending_approval: "Pendiente de aprobación", pending_payment: "Listo para pagar", payment_processing: "Pago en proceso", pending_provider: "Verificando proveedor", confirmed_demo: "Confirmación de prueba", rejected: "Solicitud rechazada", expired: "Solicitud vencida", manual_review: "Requiere revisión", refund_pending: "Reversión de prueba pendiente", refunded: "Reversión de prueba completada" };
    const body = `${SIMULATION_NOTICE}\nSolicitud: ${locked.reservationId}\nEstado registrado: ${labels[event.event] || "Actualización de la solicitud"}\nPuedes consultar el seguimiento en TravelMind. Este mensaje no confirma servicios externos.`;
    for (const channel of ["email", "whatsapp"]) await tx.insert(notificationDeliveries).values({ reservationId: locked.reservationId, eventId: locked.eventId, channel, body }).onConflictDoNothing();
    const deliveries = await tx.select().from(notificationDeliveries).where(eq(notificationDeliveries.eventId, locked.eventId)).for("update");
    for (const delivery of deliveries) {
      if (delivery.status === "sent_demo" || delivery.attempts >= 3 || delivery.nextAttemptAt > new Date()) continue;
      try {
        const reference = delivery.channel === "email" ? await sendMailpit(`${account.username}@example.test`, body, event.id) : `MOCK-WHATSAPP-${delivery.id}`;
        if (delivery.channel === "whatsapp" && (process.env.WHATSAPP_PROVIDER || "mock") !== "mock") throw new Error("Local mock only");
        await tx.update(notificationDeliveries).set({ status: "sent_demo", providerReference: reference, attempts: delivery.attempts + 1 }).where(eq(notificationDeliveries.id, delivery.id));
      } catch {
        await tx.update(notificationDeliveries).set({ status: "failed", attempts: delivery.attempts + 1, nextAttemptAt: new Date(Date.now() + 60000 * (delivery.attempts + 1)) }).where(eq(notificationDeliveries.id, delivery.id));
      }
    }
    const final = await tx.select().from(notificationDeliveries).where(eq(notificationDeliveries.eventId, locked.eventId));
    if (final.every(delivery => delivery.status === "sent_demo" || delivery.attempts >= 3)) { await tx.update(workflowOutbox).set({ status: "completed" }).where(eq(workflowOutbox.id, locked.id)); completed++; }
  });
  return { checked: tasks.length, completed };
}
