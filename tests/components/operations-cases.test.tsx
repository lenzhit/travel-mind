import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/features/visitor/client", () => ({ requestData: mocks.request }));
import { OperationsCases } from "@/components/features/analytics/operations-cases";
const empty = { items: [], page: 1, hasMore: false, simulated: true, canAssign: false };
const item = { id: "6ac917b7-a3ec-43e9-805b-46a9452e116a", status: "manual_review", reason: "payment_amount_mismatch", packageTitle: "Paquete fixture", totalMinor: 12300, currency: "USD", updatedAt: "2026-10-11T12:00:00.000Z", assignee: null, history: [], payments: [{ status: "pending", refundStatus: "not_required", totalMinor: 12300 }] };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("incidencias vacías tienen estado y paginación deshabilitada", async () => {
  mocks.request.mockResolvedValueOnce(empty); render(<OperationsCases />);
  await screen.findByText("No hay incidencias en esta página.");
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
});
it("fallo anuncia el error, dirige el foco y permite recuperar la consulta", async () => {
  mocks.request.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(empty);
  render(<OperationsCases />); expect(await screen.findByRole("alert")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar incidencias" }));
  await screen.findByText("No hay incidencias en esta página.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("pagina las incidencias y oculta la página anterior durante una nueva consulta", async () => {
  mocks.request.mockResolvedValueOnce({ ...empty, items: [item], hasMore: true }).mockResolvedValueOnce({ ...empty, page: 2 });
  render(<OperationsCases />); await screen.findByText("Paquete fixture");
  expect(screen.getByText(/El importe recibido no coincide/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2");
  expect(mocks.request).toHaveBeenLastCalledWith("/api/admin/cases?page=2");
  expect(screen.queryByText("Paquete fixture")).not.toBeInTheDocument();
});
it("una respuesta inválida no se presenta como una cola sin incidencias", async () => {
  mocks.request.mockResolvedValueOnce({ ...empty, simulated: false }); render(<OperationsCases />);
  await screen.findByRole("alert");
  expect(screen.queryByText("No hay incidencias en esta página.")).not.toBeInTheDocument();
});

it("los controles de atención tienen nombres accesibles y el cierre requiere confirmación", async () => {
  mocks.request.mockResolvedValueOnce({ ...empty, canAssign: true, items: [{ ...item, reason: "price_changed", payments: [] }] });
  render(<OperationsCases />); await screen.findByText("Paquete fixture");
  const action = screen.getByLabelText("Acción", { exact: true });
  fireEvent.change(action, { target: { value: "close_unpaid" } });
  expect(screen.getByRole("button", { name: "Guardar decisión" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Confirmo el cierre/ }));
  expect(screen.getByRole("button", { name: "Guardar decisión" })).toBeEnabled();
});
