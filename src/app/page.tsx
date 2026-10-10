import React, { Suspense } from "react";
import Link from "next/link";
import { Compass, Sparkles, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      {/* Destinos destacados */}
      <section id="destinos" className="scroll-mt-24 py-16 bg-surface border-b border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 text-accent font-semibold text-xs tracking-wider uppercase mb-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                Regiones del Perú
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                Un destino para cada viaje
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
                Encuentra tu próxima experiencia
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
  return <div className="flex-1 flex flex-col">
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-surface to-background py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="gap-2 px-4 py-1.5"><Sparkles className="size-4" aria-hidden="true" />Experiencias que empiezan contigo</Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-primary sm:text-6xl">El Perú te espera.<br /><span className="text-accent">Encuentra tu próximo viaje.</span></h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Cultura, aventura, naturaleza y descanso. Explora destinos, compara paquetes y descubre los detalles que hacen especial cada experiencia.</p>
          <div className="flex flex-col justify-center gap-3 pt-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/packages">Explorar paquetes<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="#destinos">Descubrir destinos</Link></Button>
          </div>
          <p className="text-sm text-muted-foreground">Itinerarios detallados · Servicios incluidos · Precios por persona</p>
        </div>
      </div>
    </section>
    <Suspense fallback={<CatalogSectionsSkeleton />}><HomeCatalogSections /></Suspense>
  </div>;
}
