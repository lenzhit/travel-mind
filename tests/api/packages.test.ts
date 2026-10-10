import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getPackages } from "@/app/api/packages/route";
import { GET as getPackageDetail } from "@/app/api/packages/[id]/route";
import { GET as getDestinations } from "@/app/api/destinations/route";

describe("API de Catálogo de Paquetes (/api/packages)", () => {
  it("debe listar paquetes con paginación y estructura de sobre estándar", async () => {
    const req = new NextRequest("http://localhost:3000/api/packages?page=1&pageSize=5");
    const res = await getPackages(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("meta");
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeLessThanOrEqual(5);
    expect(json.meta.page).toBe(1);
    expect(json.meta.pageSize).toBe(5);
    expect(json.meta.total).toBeGreaterThanOrEqual(12);

    // Comprobar campos del primer paquete
    const first = json.data[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("basePriceMinor");
    expect(typeof first.basePriceMinor).toBe("number");
    expect(first).toHaveProperty("currency");
    expect(first).toHaveProperty("destination");
  });

  it("debe filtrar correctamente por búsqueda textual", async () => {
    const req = new NextRequest("http://localhost:3000/api/packages?search=Machu");
    const res = await getPackages(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    for (const item of json.data) {
      const match =
        item.title.toLowerCase().includes("machu") ||
        item.description.toLowerCase().includes("machu");
      expect(match).toBe(true);
    }
  });

  it("debe filtrar por categoría válida y excluir registros no coincidentes", async () => {
    const req = new NextRequest("http://localhost:3000/api/packages?category=aventura");
    const res = await getPackages(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.length).toBeGreaterThan(0);
    for (const item of json.data) {
      expect(item.category).toBe("aventura");
    }
  });

  it("debe rechazar categorías no permitidas con HTTP 400 y código VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost:3000/api/packages?category=categoria_invalida");
    const res = await getPackages(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error).toHaveProperty("correlationId");
  });

  it("debe obtener el detalle completo de un paquete por slug existente", async () => {
    const params = Promise.resolve({ id: "machu-picchu-magico-valle-sagrado" });
    const req = new NextRequest("http://localhost:3000/api/packages/machu-picchu-magico-valle-sagrado");
    const res = await getPackageDetail(req, { params });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.slug).toBe("machu-picchu-magico-valle-sagrado");
    expect(json.data.destination).toBeDefined();
    expect(json.data.destination.name).toContain("Cusco");
    expect(Array.isArray(json.data.itinerary)).toBe(true);
    expect(json.data.itinerary.length).toBeGreaterThan(0);
    expect(Array.isArray(json.data.variants)).toBe(true);
    expect(json.data.variants.length).toBeGreaterThan(0);
  });

  it("debe retornar HTTP 404 con PACKAGE_NOT_FOUND ante un id/slug inexistente", async () => {
    const params = Promise.resolve({ id: "paquete-inexistente-xyz" });
    const req = new NextRequest("http://localhost:3000/api/packages/paquete-inexistente-xyz");
    const res = await getPackageDetail(req, { params });
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.code).toBe("PACKAGE_NOT_FOUND");
    expect(json.error).toHaveProperty("correlationId");
  });

  it("debe listar los destinos activos en /api/destinations", async () => {
    const res = await getDestinations();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(6);
    expect(json.data[0]).toHaveProperty("name");
    expect(json.data[0]).toHaveProperty("region");
  });
});
