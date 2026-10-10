import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/features/visitor/client", () => ({ requestData: mocks.request }));
import { OperationsDashboard } from "@/components/features/analytics/operations-dashboard";
const snapshot = { generatedAt: "2026-10-10T12:00:00.000Z", mode: "demo", totals: { quotations: 0, reservations: 0, confirmed: 0, pendingApprovals: 0 }, states: [], alerts: { refundPending: 0, manualReview: 0, unreconciledPayments: 0, overdueApprovals: 0, failedNotifications: 0, exhaustedNotifications: 0, delayedWorkflows: 0 } };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("muestra un estado vacío y no inventa indicadores comerciales", async () => {
  mocks.request.mockResolvedValueOnce(snapshot); render(<OperationsDashboard />);
  await screen.findByText("Todavía no hay solicitudes de reserva.");
  expect(screen.getByText(/No representa ventas ni reservas externas/)).toBeInTheDocument();
  expect(screen.getByText(/No hay incidencias pendientes/)).toBeInTheDocument();
});
it("comunica fallo inicial y permite reintentar con datos válidos", async () => {
  mocks.request.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(snapshot);
  render(<OperationsDashboard />); expect(await screen.findByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar resumen" }));
  await screen.findByText("Todavía no hay solicitudes de reserva.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("conserva la última instantánea y advierte cuando falla la actualización", async () => {
  mocks.request.mockResolvedValueOnce({ ...snapshot, totals: { ...snapshot.totals, reservations: 1 }, states: [{ status: "refund_pending", count: 1 }], alerts: { ...snapshot.alerts, refundPending: 1 } }).mockRejectedValueOnce(new Error("offline"));
  render(<OperationsDashboard />); await screen.findByText("Solicitudes con reversión pendiente");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar resumen" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("últimos datos recibidos");
  expect(screen.getByText("Reversión pendiente")).toBeInTheDocument();
});
it("rechaza una respuesta inválida sin reemplazarla por ceros", async () => {
  mocks.request.mockResolvedValueOnce({ ...snapshot, mode: "production" }); render(<OperationsDashboard />);
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(screen.queryByText("Cotizaciones")).not.toBeInTheDocument();
});
