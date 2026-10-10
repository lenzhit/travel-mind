import React from "react";
import Link from "next/link";
import { Compass, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface text-foreground/80 text-sm">
      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 font-bold text-lg text-primary">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Compass className="size-4 text-accent" aria-hidden="true" />
              </div>
              <span>
                Travel<span className="text-accent">Mind</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
              Sistema Inteligente para la Recomendación, Cotización y Reserva de Paquetes Turísticos mediante Agentes de IA. Proyecto de investigación desarrollado bajo política estricta de presupuesto cero (USD 0).
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Entorno: App Router • Next.js 16 • React 19 • Tailwind CSS • Vitest
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-foreground text-sm mb-3">Documentación</h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <span className="text-muted-foreground">AGENTS.md (Reglas y arquitectura)</span>
              </li>
              <li>
                <span className="text-muted-foreground">docs/cost-matrix.md (Matriz de costes)</span>
              </li>
              <li>
                <span className="text-muted-foreground">docs/adr/ (Decisiones de arquitectura)</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-foreground text-sm mb-3">Gobernanza</h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="text-muted-foreground">
                Política de gasto: <strong className="text-foreground">USD 0</strong>
              </li>
              <li className="text-muted-foreground">
                Inferencia: <strong className="text-foreground">Ollama local / Mock</strong>
              </li>
              <li className="text-muted-foreground">
                Pagos: <strong className="text-foreground">Simulación local segura</strong>
              </li>
              <li>
                <Link
                  href="/api/health"
                  className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
                  target="_blank"
                >
                  Inspeccionar Health Check <ExternalLink className="size-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 TravelMind. Proyecto Académico y de Investigación.</p>
          <p>Todas las transacciones y proveedores en este modo son estrictamente simulados.</p>
        </div>
      </div>
    </footer>
  );
}
