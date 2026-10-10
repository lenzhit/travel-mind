import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Calendar,
  ShieldAlert,
  Users,
  Compass,
} from "lucide-react";
import { packageService } from "@/server/services/package.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/types";

interface PackageDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PackageDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pkg = await packageService.getPackageDetail(resolvedParams.id);
  if (!pkg) {
    return { title: "Paquete no encontrado — TravelMind" };
  }
  return {
    title: `${pkg.title} — TravelMind`,
    description: pkg.description,
  };
}

function DetailSkeleton() {
  return (
    <div className="flex-1 bg-background py-8 sm:py-12 animate-pulse">
      <div className="container mx-auto px-4 sm:px-6 space-y-8">
        <div className="h-8 w-40 bg-muted rounded-md" />
        <div className="h-10 w-96 bg-muted rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-surface rounded-2xl border border-border" />
          <div className="h-96 bg-surface rounded-2xl border border-border" />
        </div>
      </div>
    </div>
  );
}

async function PackageDetailContent({ params }: PackageDetailPageProps) {
  const resolvedParams = await params;
  const pkg = await packageService.getPackageDetail(resolvedParams.id);

  if (!pkg) {
    notFound();
  }

  const formattedBasePrice = formatMoney(pkg.basePriceMinor, pkg.currency as Currency);

  return (
    <div className="flex-1 bg-background py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 space-y-8">
        {/* Navegación de retorno */}
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/packages">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver al catálogo
            </Link>
          </Button>
        </div>

        {/* Encabezado del Paquete */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              <MapPin className="size-3 mr-1" aria-hidden="true" />
              {pkg.destination.name} ({pkg.destination.region})
            </Badge>
            <Badge variant="accent" className="capitalize">
              {pkg.category}
            </Badge>
            <Badge variant="demo">
              Demostración Académica
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
            {pkg.title}
          </h1>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-accent" aria-hidden="true" />
              <strong>{pkg.durationDays}</strong> {pkg.durationDays === 1 ? "día de expedición" : "días de expedición"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Compass className="size-4 text-accent" aria-hidden="true" />
              {pkg.destination.country}
            </span>
          </div>
        </div>

        {/* Grilla Principal: Detalles (2 cols) y Caja de Cotización (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna Izquierda: Información Detallada */}
          <div className="lg:col-span-2 space-y-8">
            {/* Imagen Principal */}
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm aspect-[16/9] w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pkg.destination.imageUrl}
                alt={`Ilustración de ${pkg.title}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">
                Resumen de la Experiencia
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {pkg.description}
              </p>
            </div>

            {/* Itinerario Día por Día */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Calendar className="size-5 text-accent" aria-hidden="true" />
                <h2 className="text-xl font-bold text-foreground">
                  Itinerario Detallado
                </h2>
              </div>

              <div className="space-y-4">
                {pkg.itinerary.map((dayItem) => (
                  <div
                    key={dayItem.day}
                    className="p-4 rounded-xl border border-border bg-surface space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {dayItem.day}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-foreground">
                        {dayItem.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground pl-8 leading-relaxed">
                      {dayItem.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusiones y Exclusiones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Inclusiones */}
              <div className="space-y-3 p-5 rounded-xl border border-border bg-surface">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
                  Servicios Incluidos
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  {pkg.inclusions.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exclusiones */}
              <div className="space-y-3 p-5 rounded-xl border border-border bg-surface">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <XCircle className="size-4 text-danger" aria-hidden="true" />
                  No Incluido
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  {pkg.exclusions.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-danger mt-0.5">•</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Cotización y Variantes */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <Card className="shadow-md border-primary/20">
              <CardHeader className="p-6 pb-4 border-b border-border bg-surface/50">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Tarifa base referencial
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-primary">
                    {formattedBasePrice}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    por persona ({pkg.currency})
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Variantes disponibles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Variantes registradas
                  </h4>
                  <div className="space-y-2">
                    {pkg.variants.map((v) => {
                      const vPrice = formatMoney(v.priceMinor, pkg.currency as Currency);
                      return (
                        <div
                          key={v.id}
                          className="p-3 rounded-lg border border-border bg-background flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {v.name}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Users className="size-3" aria-hidden="true" />
                              Capacidad: hasta {v.capacity} viajeros
                            </div>
                          </div>
                          <div className="font-bold text-primary text-sm">
                            {vPrice}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advertencia Transparente de Modo Demostración */}
                <div className="p-3.5 rounded-lg border border-accent/30 bg-accent/5 text-xs text-foreground space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-accent">
                    <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
                    <span>Transparencia de Simulación</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    El motor de cotización verificable con validez de 24 horas y reconfirmación con BookerAgent se activará en la Fase 2. No se procesan cobros en esta fase.
                  </p>
                </div>

                {/* Botón no engañoso */}
                <Button
                  disabled
                  className="w-full text-xs font-medium cursor-not-allowed opacity-75"
                  aria-disabled="true"
                >
                  Cotización disponible en Fase 2
                </Button>
              </CardContent>
            </Card>

            {/* Ficha Destino */}
            <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
              <h4 className="font-bold text-sm text-foreground">
                Sobre {pkg.destination.name}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pkg.destination.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PackageDetailPage({ params }: PackageDetailPageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PackageDetailContent params={params} />
    </Suspense>
  );
}
