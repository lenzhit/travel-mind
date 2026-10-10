import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

describe("Componentes UI Fundamentales", () => {
  it("renderiza el botón con variantes por defecto y accesibilidad", () => {
    render(<Button>Explorar</Button>);
    const button = screen.getByRole("button", { name: /explorar/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-primary");
  });

  it("renderiza el badge de experiencias", () => {
    render(<Badge variant="outline">Experiencias en Perú</Badge>);
    const badge = screen.getByText("Experiencias en Perú");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("border-border");
  });
});
