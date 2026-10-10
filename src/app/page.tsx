import React, { Suspense } from "react";
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
  ArrowRight,
  MapPin,
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
import { packageService } from "@/server/services/package.service";
import { PackageCard } from "@/components/features/catalog/package-card";

function CatalogSectionsSkeleton() {
  return (
    <div className="py-16 bg-surface border-b border-border animate-pulse">
      <div className="container mx-auto px-4 sm:px-6 space-y-8">
        <div className="h-8 w-64 bg-muted rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-background rounded-xl border border-border" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function HomeCatalogSections() {
  const [featuredData, destinationsList] = await Promise.all([
    packageService.listPackages({
      page: 1,
      pageSize: 3,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    packageService.listDestinations(),
  ]);

  const featuredPackages = featuredData.items;

  return (
    <>
      {/* Destinos Destacados (Fase 1A) */}
      <section className="py-16 bg-surface border-b border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 text-accent font-semibold text-xs tracking-wider uppercase mb-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                Regiones del Perú
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                Destinos Turísticos Disponibles
              </h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/packages">
                Ver todos los paquetes
                <ArrowRight className="size-3.5 ml-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinationsList.slice(0, 6).map((dest) => (
              <Link
                key={dest.id}
                href={`/packages?destinationId=${dest.id}`}
                className="group relative overflow-hidden rounded-xl border border-border bg-background shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.imageUrl}
                    alt={`Paisaje ilustrativo de ${dest.name}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                    {dest.region} • {dest.country}
                  </div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {dest.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Paquetes Destacados en Catálogo */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 text-accent font-semibold text-xs tracking-wider uppercase mb-1">
                <Compass className="size-3.5" aria-hidden="true" />
                Experiencias Destacadas
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                Paquetes en Catálogo Persistido
              </h2>
            </div>
            <Button asChild variant="default" size="sm">
              <Link href="/packages">
                Ver catálogo completo ({featuredData.meta.total} experiencias)
                <ArrowRight className="size-3.5 ml-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPackages.map((pkg) => (
              <PackageCard key={pkg.id} packageItem={pkg} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

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
                Fase 1A: Catálogo Turístico & PostgreSQL Operativo
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-primary leading-tight">
              Sistema Inteligente para la Recomendación, Cotización y Reserva Turística
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              TravelMind integra un catálogo turístico persistido en PostgreSQL con pgvector, trazabilidad en céntimos enteros y una estricta política de <strong>presupuesto cero (USD 0)</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                <Link href="/packages">
                  Explorar Catálogo Turístico
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
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

      {/* Secciones dinámicas de catálogo con Suspense */}
      <Suspense fallback={<CatalogSectionsSkeleton />}>
        <HomeCatalogSections />
      </Suspense>

      {/* Pilares Fundamentales */}
      <section id="fundamentos" className="py-16 bg-surface border-t border-border">
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
                    PostgreSQL 16 local + pgvector
                  </li>
                  <li className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3.5 text-accent" aria-hidden="true" />
                    Drizzle ORM con migraciones versionadas
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
      <section id="arquitectura" className="py-16 bg-background border-t border-border">
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
            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Layers className="size-4 text-accent" aria-hidden="true" />
                <span>src/app/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rutas públicas, catálogo (/packages), detalle y endpoints de API con App Router.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Compass className="size-4 text-accent" aria-hidden="true" />
                <span>src/features/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Módulos de catálogo con validación Zod, esquemas y tipos de dominio.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Server className="size-4 text-accent" aria-hidden="true" />
                <span>src/server/</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Drizzle ORM, repositorios transaccionales, migraciones y seeders de demostración.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface space-y-2">
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
      <section id="estado-sistema" className="py-16 bg-surface border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-background p-6 sm:p-8 shadow-sm">
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
                Fase 1A Operativa
              </Badge>
            </div>

            <div className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Ruta de verificación:</span>
                  <code className="font-mono text-primary font-medium">/api/health</code>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Persistencia:</span>
                  <span className="font-semibold text-foreground">PostgreSQL 16 + pgvector</span>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Catálogo Demo:</span>
                  <span className="font-semibold text-foreground">14 paquetes • 6 destinos</span>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">ORM:</span>
                  <span className="font-semibold text-foreground">Drizzle ORM (Apache-2.0)</span>
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
