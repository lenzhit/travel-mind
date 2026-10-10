"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, RotateCcw, Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Destination } from "@/server/db/schema";

interface PackageFiltersProps {
  destinations: Destination[];
}

export function PackageFilters({ destinations }: PackageFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [destinationId, setDestinationId] = useState(searchParams.get("destinationId") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [maxPriceMinor, setMaxPriceMinor] = useState(searchParams.get("maxPriceMinor") || "");
  const [durationDays, setDurationDays] = useState(searchParams.get("durationDays") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");

  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (destinationId) params.set("destinationId", destinationId);
    if (category) params.set("category", category);
    if (maxPriceMinor) params.set("maxPriceMinor", maxPriceMinor);
    if (durationDays) params.set("durationDays", durationDays);
    if (sortBy && sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder && sortOrder !== "desc") params.set("sortOrder", sortOrder);
    params.set("page", "1"); // Siempre reiniciar a página 1 al filtrar

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setSearch("");
    setDestinationId("");
    setCategory("");
    setMaxPriceMinor("");
    setDurationDays("");
    setSortBy("createdAt");
    setSortOrder("desc");

    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    search || destinationId || category || maxPriceMinor || durationDays || (sortBy !== "createdAt" && sortBy)
  );

  return (
    <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
      {/* Barra superior de búsqueda rápida y botón móvil */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <label htmlFor="search-input" className="sr-only">
            Buscar paquetes turísticos por nombre o descripción
          </label>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyFilters();
              }
            }}
            placeholder="Buscar por destino, nevado, santuario..."
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="default"
            onClick={applyFilters}
            disabled={isPending}
            className="flex-1 sm:flex-initial"
          >
            <Filter className="size-4" aria-hidden="true" />
            {isPending ? "Filtrando..." : "Buscar"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            className="sm:hidden"
            aria-expanded={isOpenMobile}
            aria-label="Alternar filtros avanzados"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
              title="Restablecer filtros"
            >
              <RotateCcw className="size-4 mr-1" aria-hidden="true" />
              <span className="hidden sm:inline">Limpiar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Controles de filtros (visibles en desktop o cuando se despliegan en móvil) */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-border ${
          isOpenMobile ? "block" : "hidden sm:grid"
        }`}
      >
        {/* Destino */}
        <div>
          <label htmlFor="filter-destination" className="block text-xs font-semibold text-foreground mb-1.5">
            Destino
          </label>
          <select
            id="filter-destination"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos los destinos</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.region})
              </option>
            ))}
          </select>
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="filter-category" className="block text-xs font-semibold text-foreground mb-1.5">
            Categoría
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todas las categorías</option>
            <option value="aventura">Aventura</option>
            <option value="cultural">Cultural</option>
            <option value="naturaleza">Naturaleza</option>
            <option value="gastronomico">Gastronómico</option>
            <option value="relax">Relax / Playa</option>
          </select>
        </div>

        {/* Duración */}
        <div>
          <label htmlFor="filter-duration" className="block text-xs font-semibold text-foreground mb-1.5">
            Duración
          </label>
          <select
            id="filter-duration"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Cualquier duración</option>
            <option value="2">2 días</option>
            <option value="3">3 días</option>
            <option value="4">4 días</option>
            <option value="5">5 días</option>
            <option value="8">8 días</option>
          </select>
        </div>

        {/* Precio Máximo */}
        <div>
          <label htmlFor="filter-price" className="block text-xs font-semibold text-foreground mb-1.5">
            Precio Máximo
          </label>
          <select
            id="filter-price"
            value={maxPriceMinor}
            onChange={(e) => setMaxPriceMinor(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Sin límite</option>
            <option value="30000">Hasta USD 300</option>
            <option value="60000">Hasta USD 600</option>
            <option value="100000">Hasta USD 1,000</option>
            <option value="200000">Hasta USD 2,000</option>
          </select>
        </div>

        {/* Ordenamiento */}
        <div>
          <label htmlFor="filter-sort" className="block text-xs font-semibold text-foreground mb-1.5">
            Ordenar por
          </label>
          <select
            id="filter-sort"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-");
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="createdAt-desc">Más recientes</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
            <option value="duration-asc">Duración: Menor a Mayor</option>
            <option value="title-asc">Nombre: A - Z</option>
          </select>
        </div>
      </div>
    </div>
  );
}
