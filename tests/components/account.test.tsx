import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn(), prepare: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/features/visitor/client", async importOriginal => ({ ...await importOriginal<typeof import("@/features/visitor/client")>(), requestData: mocks.request, prepareVisitor: mocks.prepare }));
import { RequestError } from "@/features/visitor/client";
import AccountPage, { accountReturnTo } from "@/app/account/page";
beforeEach(() => { mocks.request.mockRejectedValue(new RequestError("Sesión requerida", 401)); mocks.prepare.mockResolvedValue(undefined); window.history.replaceState({}, "", "/account"); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("muestra/oculta contraseña sin perderla ni enviar el formulario", async () => {
  render(<AccountPage />); const password = await screen.findByLabelText("Contraseña");
  fireEvent.change(password, { target: { value: "fixture-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
  expect(password).toHaveAttribute("type", "text"); expect(password).toHaveValue("fixture-password");
  fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
  expect(password).toHaveAttribute("type", "password"); expect(mocks.prepare).not.toHaveBeenCalled();
});
it("un fallo de conexión permite reintentar sin fingir sesión cerrada", async () => {
  mocks.request.mockRejectedValueOnce(new Error("offline")); render(<AccountPage />);
  expect(await screen.findByRole("alert")).toHaveFocus();
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));
  await screen.findByRole("form", { name: "Iniciar sesión" });
});
it("registro exige confirmación coincidente antes de llamar al servidor", async () => {
  render(<AccountPage />); fireEvent.click(await screen.findByRole("button", { name: "Crear una cuenta" }));
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "fixture-password" } });
  fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "other-fixture-password" } });
  fireEvent.submit(screen.getByRole("form", { name: "Crear cuenta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("no coinciden"); expect(mocks.prepare).not.toHaveBeenCalled();
});
it("ingreso normaliza el usuario y retorna a la solicitud autorizada", async () => {
  const target = "/reservations/12345678-1234-1234-1234-123456789abc";
  window.history.replaceState({}, "", `/account?returnTo=${target}`);
  mocks.request.mockRejectedValueOnce(new RequestError("Sesión requerida", 401)).mockResolvedValueOnce({ username: "fixture" });
  render(<AccountPage />); fireEvent.change(await screen.findByLabelText("Usuario"), { target: { value: "FIXTURE" } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "fixture-password" } });
  fireEvent.submit(screen.getByRole("form", { name: "Iniciar sesión" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(target));
  expect(JSON.parse(mocks.request.mock.calls[1][1].body).username).toBe("fixture");
});
it("no navega a destinos externos ni URLs ejecutables", () => {
  for (const url of [null, "//other.test", "https://other.test", "javascript:alert(1)", "/admin", "/quotes/../admin"]) expect(accountReturnTo(url)).toBe("/reservations");
});
it.each(["customer", "admin", "approver"])("Mi cuenta muestra solo herramientas del rol %s", async role => {
  mocks.request.mockResolvedValueOnce({ username: "fixture", role });
  render(<AccountPage />); await screen.findByText("fixture");
  expect(!!screen.queryByRole("link", { name: /Consultar mis reservas/ })).toBe(role === "customer");
  expect(!!screen.queryByRole("link", { name: /Gestionar paquetes/ })).toBe(role === "admin");
  expect(!!screen.queryByRole("link", { name: /Resumen operativo/ })).toBe(role === "admin");
  expect(!!screen.queryByRole("link", { name: /Revisar solicitudes/ })).toBe(role === "admin" || role === "approver");
});

