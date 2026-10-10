/**
 * Módulo de Reservas y Checkout (Fase 3 placeholder)
 * Gestiona el ciclo de vida de la reserva y control HITL.
 */

export interface ReservationSummary {
  id: string;
  quotationId: string;
  status:
    | "requested"
    | "pending_approval"
    | "pending_payment"
    | "payment_processing"
    | "pending_provider"
    | "confirmed"
    | "confirmed_demo"
    | "failed"
    | "cancelled";
}
