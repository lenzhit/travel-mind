import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackageCard } from "@/components/features/catalog/package-card";
import { Pagination } from "@/components/features/catalog/pagination";
import type { PackageListItem } from "@/features/catalog";

const samplePackages: PackageListItem[] = [
  {
    id: "pkg-1",
    destinationId: "dest-1",
    title: "Machu Picchu Mágico & Valle Sagrado",
    slug: "machu-picchu-magico-valle-sagrado",
    description: "Recorrido por los principales centros arqueológicos de Cusco.",
    durationDays: 4,
    category: "cultural",
    basePriceMinor: 65000,
    currency: "USD",
    inclusions: ["Tren", "Entrada"],
    exclusions: ["Vuelos"],
    itinerary: [{ day: 1, title: "Llegada", description: "City tour" }],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    destination: {
      id: "dest-1",
      name: "Cusco",
      slug: "cusco",
      country: "Perú",
      region: "Cusco",
      description: "Capital inca",
      imageUrl: "data:image/svg+xml;utf8,<svg></svg>",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: "pkg-2",
    destinationId: "dest-2",
    title: "Cañón del Colca & Mirador de Cóndores",
    slug: "canon-colca-mirador-condores",
    description: "Vuelo de cóndores y aguas termales.",
    durationDays: 3,
    category: "naturaleza",
    basePriceMinor: 34000,
    currency: "USD",
    inclusions: ["Guía", "Transporte"],
    exclusions: ["Cenas"],
    itinerary: [{ day: 1, title: "Viaje", description: "Chivay" }],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    destination: {
      id: "dest-2",
      name: "Arequipa",
      slug: "arequipa",
      country: "Perú",
      region: "Arequipa",
      description: "Ciudad blanca",
      imageUrl: "data:image/svg+xml;utf8,<svg></svg>",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

describe("Recorrido E2E del Catálogo (Componentes e Interacción)", () => {
  it("permite explorar múltiples paquetes turísticos con enlaces accesibles y paginación", () => {
    render(
      <main>
        <section aria-label="Listado de paquetes">
          {samplePackages.map((pkg) => (
            <PackageCard key={pkg.id} packageItem={pkg} />
          ))}
        </section>
        <Pagination
          currentPage={1}
          totalPages={2}
          basePath="/packages"
          queryParams={{ search: "Cusco" }}
        />
      </main>
    );

    // Comprobar que los títulos de los paquetes se encuentran en el documento
    expect(
      screen.getByText("Machu Picchu Mágico & Valle Sagrado")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cañón del Colca & Mirador de Cóndores")
    ).toBeInTheDocument();

    // Comprobar enlaces de detalle hacia las rutas correctas
    const links = screen.getAllByRole("link", { name: /ver detalle/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      "/packages/machu-picchu-magico-valle-sagrado"
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/packages/canon-colca-mirador-condores"
    );

    // Comprobar controles de paginación accesibles
    const nextButton = screen.getByRole("link", { name: /siguiente/i });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toHaveAttribute("href", "/packages?search=Cusco&page=2");
  });
});
