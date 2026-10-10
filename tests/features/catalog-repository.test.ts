import { describe, it, expect } from "vitest";
import { packageRepository } from "@/server/repositories/package.repository";
import { db } from "@/server/db";
import { packages, destinations } from "@/server/db/schema";
import { eq } from "drizzle-orm";

describe("PackageRepository (Consultas a PostgreSQL)", () => {
  it("recupera paquetes activos ordenados por precio ascendente", async () => {
    const result = await packageRepository.findPackages({
      page: 1,
      pageSize: 5,
      sortBy: "price",
      sortOrder: "asc",
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(12);

    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].basePriceMinor).toBeGreaterThanOrEqual(
        result.items[i - 1].basePriceMinor
      );
    }
  });

  it("recupera paquetes activos ordenados por precio descendente", async () => {
    const result = await packageRepository.findPackages({
      page: 1,
      pageSize: 5,
      sortBy: "price",
      sortOrder: "desc",
    });

    expect(result.items.length).toBeGreaterThan(0);
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i].basePriceMinor).toBeLessThanOrEqual(
        result.items[i - 1].basePriceMinor
      );
    }
  });

  it("filtra por rango de precios en céntimos enteros", async () => {
    const minPriceMinor = 30000; // USD 300
    const maxPriceMinor = 70000; // USD 700

    const result = await packageRepository.findPackages({
      minPriceMinor,
      maxPriceMinor,
      page: 1,
      pageSize: 10,
      sortBy: "price",
      sortOrder: "asc",
    });

    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.basePriceMinor).toBeGreaterThanOrEqual(minPriceMinor);
      expect(item.basePriceMinor).toBeLessThanOrEqual(maxPriceMinor);
    }
  });

  it("filtra por duración exacta en días", async () => {
    const result = await packageRepository.findPackages({
      durationDays: 4,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.durationDays).toBe(4);
    }
  });

  it("excluye paquetes inactivos del catálogo público", async () => {
    // Insertar temporalmente un paquete inactivo
    const [dest] = await db.select().from(destinations).limit(1);
    const [inactivePkg] = await db
      .insert(packages)
      .values({
        destinationId: dest.id,
        title: "Paquete Inactivo Oculto Test",
        slug: `paquete-inactivo-test-${Date.now()}`,
        description: "No debe aparecer en búsquedas públicas.",
        durationDays: 1,
        category: "cultural",
        basePriceMinor: 10000,
        currency: "USD",
        status: "inactive",
      })
      .returning();

    try {
      // Búsqueda general
      const list = await packageRepository.findPackages({
        search: "Paquete Inactivo Oculto Test",
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      expect(list.items.find((p) => p.id === inactivePkg.id)).toBeUndefined();

      // Búsqueda directa por ID o slug
      const detail = await packageRepository.findByIdOrSlug(inactivePkg.id);
      expect(detail).toBeNull();
    } finally {
      // Limpieza
      await db.delete(packages).where(eq(packages.id, inactivePkg.id));
    }
  });
});
