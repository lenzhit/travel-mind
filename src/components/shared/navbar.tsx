"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Compass, Menu, X, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg sm:text-xl text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Compass className="size-5 text-accent" aria-hidden="true" />
            </div>
            <span>
              Travel<span className="text-accent">Mind</span>
            </span>
          </Link>
          <Badge variant="demo" className="hidden sm:inline-flex gap-1">
            <ShieldCheck className="size-3 text-accent" aria-hidden="true" />
            USD 0 Demo
          </Badge>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          <Link
            href="/packages"
            className="text-foreground hover:text-primary font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 py-0.5"
          >
            Catálogo
          </Link>
          <Link
            href="/#fundamentos"
            className="text-foreground/80 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 py-0.5"
          >
            Fundamentos
          </Link>
          <Link
            href="/#arquitectura"
            className="text-foreground/80 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 py-0.5"
          >
            Arquitectura
          </Link>
          <Link
            href="/#estado-sistema"
            className="text-foreground/80 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 py-0.5"
          >
            Estado del Sistema
          </Link>
        </nav>

        {/* Action Button */}
        <div className="hidden sm:flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-accent/40 text-accent hover:bg-accent/10"
          >
            <a href="/api/health" target="_blank" rel="noreferrer">
              API Health Check
            </a>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
          className="md:hidden flex size-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mobileMenuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="/packages"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-foreground font-semibold"
            >
              Catálogo de Paquetes
            </Link>
            <Link
              href="/#fundamentos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-foreground"
            >
              Fundamentos
            </Link>
            <Link
              href="/#arquitectura"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-foreground"
            >
              Arquitectura
            </Link>
            <Link
              href="/#estado-sistema"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-md hover:bg-muted text-foreground"
            >
              Estado del Sistema
            </Link>
          </nav>
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <Badge variant="demo">Presupuesto USD 0</Badge>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/health" target="_blank" rel="noreferrer">
                /api/health
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
