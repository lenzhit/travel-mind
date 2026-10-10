import React from "react";
import Link from "next/link";
import {
  Compass,
  Cpu,
  ShieldAlert,
  Server,
  Layers,
  CheckCircle2,
  ExternalLink,
  Code2,
  Workflow,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-border bg-gradient-to-b from-surface to-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2">
              <Badge variant="demo" className="text-xs py-1 px-3">
                <Sparkles className="size-3.5 text-accent mr-1" aria-hidden="true" />
                Fase 0: Fundamentos y Arquitectura Inicial
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary leading-tight">
              Sistema Inteligente para la Recomendación, Cotización y Reserva Turística
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              TravelMind es una plataforma basada en agentes de IA y flujos orquestados diseñada bajo una estricta política de <strong>presupuesto cero (USD 0)</strong>, con trazabilidad, transparencia en precios y revisión humana (HITL).
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="#fundamentos">Ver Fundamentos</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <a href="/api/health" target="_blank" rel="noreferrer">
                  Inspeccionar Health Check
                  <ExternalLink className="size-4 ml-1" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares Fundamentales (Fase 0) */}
      <section id="fundamentos" className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-3">
              Fundamentos de Ingeniería de TravelMind
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Principios no negociables establecidos en AGENTS.md y en la matriz de presupuesto para asegurar un desarrollo académico verificable y escalable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">Presupuesto USD 0</CardTitle>
                <CardDescription>
                  Política prioritaria sin desembolso obligatorio
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Toda la pila técnica utiliza software de código abierto y autoalojable o planes gratuitos permanentes sin tarjetas ni APIs comerciales de pago.
                </p>
                <ul className="space-y-1.5 pt-2 text-xs font-mono">
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    Next.js + React 19 + TypeScript
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    PostgreSQL local + pgvector
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    Ollama local (Qwen2.5 / Apache-2.0)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="size-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-2">
                  <Cpu className="size-5 text-accent" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">IA Acotada y Trazable</CardTitle>
                <CardDescription>
                  Recomendador con RAG y Reconfirmación determinista
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  El modelo de IA solo interactúa mediante herramientas de sólo lectura y contratos Zod estrictos. Las cotizaciones y reservas son validadas por el servidor.
                </p>
                <ul className="space-y-1.5 pt-2 text-xs font-mono">
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    RecommenderAgent (RAG filtrado)
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    Cotización con validez de 24 horas
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    HITL para importes &gt; USD 2 000
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="size-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center mb-2">
                  <Workflow className="size-5 text-warning" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">Orquestación y Mocks</CardTitle>
                <CardDescription>
                  Flujos asíncronos y proveedores desacoplados
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Arquitectura tolerante a fallos con adaptadores mock para catálogo, pagos y mensajería, garantizando que el sistema complete recorridos E2E sin servicios de pago.
                </p>
                <ul className="space-y-1.5 pt-2 text-xs font-mono">
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    MockTravelProvider local
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    MockPaymentProvider con idempotencia
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    Mailpit local (SMTP simulado)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Arquitectura Modular */}
      <section id="arquitectura" className="py-16 bg-surface border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-3">
              Estructura Modular del Código
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Separación explícita entre presentación (App Router), lógica de negocio (Features / Services) y acceso a datos / proveedores (Server).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-border bg-background space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Layers className="size-4 text-accent" aria-hidden="true" />
                <span>src/app/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rutas públicas, autenticadas y endpoints de API con App Router.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Compass className="size-4 text-accent" aria-hidden="true" />
                <span>src/features/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Módulos de catálogo, chat con agentes, cotizaciones y reservas.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Server className="size-4 text-accent" aria-hidden="true" />
                <span>src/server/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Servicios de dominio, repositorios transaccionales y adaptadores de proveedores.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Code2 className="size-4 text-accent" aria-hidden="true" />
                <span>src/components/ui/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Componentes de diseño accesibles basados en Radix y tokens visuales de TravelMind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Estado del Sistema */}
      <section id="estado-sistema" className="py-16 bg-background border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Diagnóstico y Salud de la Aplicación
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Endpoint verificado localmente para monitoreo sin SaaS de pago.
                </p>
              </div>
              <Badge variant="accent" className="gap-1.5 py-1 px-3">
                <span className="size-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                Fase 0 Operativa
              </Badge>
            </div>

            <div className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Ruta de verificación:</span>
                  <code className="font-mono text-primary font-medium">/api/health</code>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Modo configurado:</span>
                  <span className="font-semibold text-foreground">demo</span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Inferencia de IA:</span>
                  <span className="font-semibold text-foreground">Ollama Local</span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Motor de Pruebas:</span>
                  <span className="font-semibold text-foreground">Vitest + JSDOM</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Button asChild variant="outline" size="sm">
                  <Link href="/api/health" target="_blank">
                    Ejecutar llamada GET /api/health
                    <ExternalLink className="size-3.5 ml-1" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
