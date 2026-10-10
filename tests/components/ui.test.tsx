import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoBanner } from "@/components/shared/demo-banner";

describe("Componentes UI Fundamentales", () => {
  it("renderiza el botón con variantes por defecto y accesibilidad", () => {
    render(<Button>Explorar</Button>);
    const button = screen.getByRole("button", { name: /explorar/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-primary");
  });

  it("renderiza el badge con la variante demo", () => {
    render(<Badge variant="demo">USD 0 Demo</Badge>);
    const badge = screen.getByText("USD 0 Demo");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-accent");
  });

  it("renderiza el DemoBanner con rol complementario y advertencia explícita de simulación", () => {
    render(<DemoBanner />);
    const banner = screen.getByRole("complementary", { name: /aviso de modo demostración/i });
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/MODO DEMOSTRACIÓN ACTIVO/i)).toBeInTheDocument();
    expect(screen.getByText(/No se realizan cobros ni reservas reales/i)).toBeInTheDocument();
  });
});
