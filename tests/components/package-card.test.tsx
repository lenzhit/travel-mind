import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PackageCard } from "@/components/features/catalog/package-card";
import type { PackageListItem } from "@/features/catalog";

const mockPackageItem: PackageListItem = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  destinationId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  title: "Aventura en el Cañón del Colca",
  slug: "aventura-canon-del-colca",
  description: "Explora la profundidad del cañón y contempla el vuelo de los cóndores andinos.",
  durationDays: 3,
  category: "aventura",
  basePriceMinor: 34000,
  currency: "USD",
  inclusions: ["Transporte", "Boleto turístico"],
  exclusions: ["Vuelos"],
  itinerary: [{ day: 1, title: "Llegada a Chivay", description: "Aclimatación y baños termales" }],
  status: "active",
  createdAt: new Date("2026-10-10T00:00:00Z"),
  updatedAt: new Date("2026-10-10T00:00:00Z"),
  destination: {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    name: "Arequipa y Colca",
    slug: "arequipa-colca",
    country: "Perú",
    region: "Arequipa",
    description: "Ciudad blanca y cañón.",
    imageUrl: "data:image/svg+xml;utf8,<svg></svg>",
    status: "active",
    createdAt: new Date("2026-10-10T00:00:00Z"),
    updatedAt: new Date("2026-10-10T00:00:00Z"),
  },
};

describe("PackageCard Component", () => {
  it("renderiza el título, destino, duración y precio formateado en es-PE", () => {
    render(<PackageCard packageItem={mockPackageItem} />);

    expect(screen.getByText("Aventura en el Cañón del Colca")).toBeInTheDocument();
    expect(screen.getByText("Arequipa")).toBeInTheDocument();
    expect(screen.getByText(/3 días/)).toBeInTheDocument();
    expect(screen.getByText("aventura")).toBeInTheDocument();

    // 34000 centavos USD -> $340.00 o US$ 340.00
    expect(screen.getByText(/340[,.]00/)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /ver detalle/i });
    expect(link).toHaveAttribute("href", "/packages/aventura-canon-del-colca");
  });
});
