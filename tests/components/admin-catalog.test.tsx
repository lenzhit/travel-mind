import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminCatalog } from "@/components/features/admin/admin-catalog";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Panel administrativo", () => {
  it("comunica errores sin ofrecer un segundo login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Inicia sesión para administrar el catálogo." } }) }));
    render(<AdminCatalog />);
    await screen.findByText("Inicia sesión para administrar el catálogo.");
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ingresar" })).not.toBeInTheDocument();
  });
  it("conserva inclusiones e itinerario al editar y envía la versión esperada", async () => {
    const row = { id: "demo-id", updatedAt: "2026-10-10T12:00:00.000Z", destinationId: "destination", title: "Paquete demo", slug: "paquete-demo", description: "Descripción demo aprobada", durationDays: 1, category: "cultural", basePriceMinor: 12300, currency: "USD", inclusions: ["Visita demo"], exclusions: ["Vuelo"], itinerary: [{ day: 1, title: "Llegada", description: "Actividad demo" }], status: "active" };
    const calls = vi.fn(async (url: string, options?: RequestInit) => ({ ok: true, json: async () => ({ data: url === "/api/destinations" ? [{ id: "destination", name: "Destino demo" }] : options?.method === "PATCH" ? row : url.includes("packages") ? [row] : { role: "admin" } }) }));
    vi.stubGlobal("fetch", calls);
    render(<AdminCatalog />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar Paquete demo" }));
    expect(screen.getByLabelText("Título")).toHaveFocus();
    expect(screen.getByLabelText("Incluye (uno por línea)")).toHaveValue("Visita demo");
    expect(screen.getByLabelText("Itinerario (cada línea: título | descripción)")).toHaveValue("Llegada | Actividad demo");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(calls.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(true));
    const [, options] = calls.mock.calls.find(([, options]) => options?.method === "PATCH")!;
    expect(JSON.parse(options!.body as string)).toMatchObject({ inclusions: row.inclusions, itinerary: row.itinerary, expectedUpdatedAt: row.updatedAt });
  });
});

