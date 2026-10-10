import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles, Frown } from "lucide-react";
import { packageService } from "@/server/services/package.service";
import { packageQuerySchema } from "@/features/catalog/schemas";
import { PackageCard } from "@/components/features/catalog/package-card";
import { PackageFilters } from "@/components/features/catalog/package-filters";
import { Pagination } from "@/components/features/catalog/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Catálogo de Paquetes Turísticos — TravelMind",
  description:
    "Explora paquetes turísticos verificables en los principales destinos de Perú. Demostración académica con presupuesto cero.",
};

interface PackagesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function CatalogSkeleton() {
  return (
    <div className="flex-1 bg-background py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded-md" />
        <div className="h-24 w-full bg-surface rounded-xl border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function PackagesContent({ searchParams }: PackagesPageProps) {
  const resolvedSearchParams = await searchParams;

  const rawParams = {
    search: typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : undefined,
    destinationId: typeof resolvedSearchParams.destinationId === "string" ? resolvedSearchParams.destinationId : undefined,
    category: typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined,
    minPriceMinor: typeof resolvedSearchParams.minPriceMinor === "string" ? resolvedSearchParams.minPriceMinor : undefined,
    maxPriceMinor: typeof resolvedSearchParams.maxPriceMinor === "string" ? resolvedSearchParams.maxPriceMinor : undefined,
    durationDays: typeof resolvedSearchParams.durationDays === "string" ? resolvedSearchParams.durationDays : undefined,
    sortBy: typeof resolvedSearchParams.sortBy === "string" ? resolvedSearchParams.sortBy : undefined,
    sortOrder: typeof resolvedSearchParams.sortOrder === "string" ? resolvedSearchParams.sortOrder : undefined,
    page: typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined,
    pageSize: typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined,
  };

  const parsed = packageQuerySchema.safeParse(rawParams);
  const query = parsed.success
    ? parsed.data
    : {
        page: 1,
        pageSize: 9,
        sortBy: "createdAt" as const,
        sortOrder: "desc" as const,
      };

  const [catalogData, destinations] = await Promise.all([
    packageService.listPackages(query),
    packageService.listDestinations(),
  ]);

  const { items, meta } = catalogData;

  return (
    <div className="flex-1 bg-background py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 space-y-8">
        {/* Cabecera del Catálogo */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <Badge variant="demo" className="text-xs">
                <Sparkles className="size-3 mr-1 text-accent" aria-hidden="true" />
                Catálogo Turístico de Demostración
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
              Explorar Paquetes en Perú
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              Descubre itinerarios culturales, de aventura y naturaleza. Consulta tarifas referenciales calculadas en céntimos enteros bajo política de presupuesto cero.
            </p>
          </div>

          <div className="text-xs text-muted-foreground font-mono bg-surface p-2.5 rounded-lg border border-border">
            Total paquetes: <strong className="text-foreground">{meta.total}</strong> • Página{" "}
            <strong className="text-foreground">{meta.page}</strong> de{" "}
            <strong className="text-foreground">{meta.totalPages}</strong>
          </div>
        </div>

        {/* Panel de Filtros Interactivos */}
        <PackageFilters destinations={destinations} />

        {/* Listado de Paquetes o Estado Vacío */}
        {items.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((pkg) => (
                <PackageCard key={pkg.id} packageItem={pkg} />
              ))}
            </div>

            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              basePath="/packages"
              queryParams={{
                search: query.search,
                destinationId: query.destinationId,
                category: query.category,
                maxPriceMinor: query.maxPriceMinor,
                durationDays: query.durationDays,
                sortBy: query.sortBy,
                sortOrder: query.sortOrder,
              }}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Frown className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                No se encontraron paquetes
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                No hay resultados coincidentes con los filtros seleccionados. Intenta ampliar los rangos de precio o buscar por otro destino.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/packages">
                <Compass className="size-4 mr-1.5" aria-hidden="true" />
                Ver todos los paquetes
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PackagesPage({ searchParams }: PackagesPageProps) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <PackagesContent searchParams={searchParams} />
    </Suspense>
  );
}
