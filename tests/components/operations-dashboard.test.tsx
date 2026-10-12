import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/features/visitor/client", () => ({ requestData: mocks.request }));
import { OperationsDashboard } from "@/components/features/analytics/operations-dashboard";
const snapshot = { generatedAt: "2026-10-10T12:00:00.000Z", mode: "demo", totals: { quotations: 0, reservations: 0, confirmed: 0, pendingApprovals: 0 }, cohort: { windowDays: 7, consultedSessions: 0, confirmedSessions: 0 }, kpis: { windowDays: 7, consultations: 0, automaticRecommendations: 0, quotes: 0, acceptedQuotes: 0, reservations: 0, confirmed: 0, failed: 0, openIncidents: 0, resolvedIncidents: 0, notifications: 0, notificationsSent: 0, eventRetries: 0, workflowErrors: 0, firstResponseSamples: 0, firstResponseP50Ms: null, firstResponseP95Ms: null, confirmationSamples: 0, confirmationP50Ms: null, resolutionSamples: 0, resolutionP50Ms: null }, states: [], alerts: { refundPending: 0, manualReview: 0, unreconciledPayments: 0, overdueApprovals: 0, failedNotifications: 0, exhaustedNotifications: 0, delayedWorkflows: 0 } };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("muestra un estado vacío y no inventa indicadores comerciales", async () => {
  mocks.request.mockResolvedValueOnce(snapshot); render(<OperationsDashboard />);
  await screen.findByText("Todavía no hay solicitudes de reserva.");
  expect(screen.getByText(/No representa ventas ni reservas externas/)).toBeInTheDocument();
  expect(screen.getByText(/Sin denominador suficiente/)).toBeInTheDocument();
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
it("muestra tasas con denominador real y tiempos solo si hay muestras", async () => {
  mocks.request.mockResolvedValueOnce({ ...snapshot, kpis: { ...snapshot.kpis, consultations: 4, automaticRecommendations: 3, quotes: 2, acceptedQuotes: 1, firstResponseSamples: 2, firstResponseP50Ms: 800, firstResponseP95Ms: 1200 } });
  render(<OperationsDashboard />);
  expect(await screen.findByText(/3 \/ 4 · 75 %/)).toBeInTheDocument();
  expect(screen.getByText(/0[,.]8 s \/ 1[,.]2 s/)).toBeInTheDocument();
  expect(screen.getAllByText(/Sin muestra \(0 muestras\)/)).toHaveLength(2);
});
