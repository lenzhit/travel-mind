import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  queryParams: Record<string, string | number | undefined>;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  queryParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== "" && key !== "page") {
        params.set(key, String(val));
      }
    });
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Paginación de resultados"
      className="flex items-center justify-center gap-2 py-8"
    >
      <Button
        asChild
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
      >
        <Link
          href={createPageUrl(currentPage - 1)}
          aria-label="Ir a la página anterior"
        >
          <ChevronLeft className="size-4 mr-1" aria-hidden="true" />
          Anterior
        </Link>
      </Button>

      <span className="text-xs text-muted-foreground px-3 font-medium">
        Página <strong className="text-foreground">{currentPage}</strong> de{" "}
        <strong className="text-foreground">{totalPages}</strong>
      </span>

      <Button
        asChild
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
      >
        <Link
          href={createPageUrl(currentPage + 1)}
          aria-label="Ir a la página siguiente"
        >
          Siguiente
          <ChevronRight className="size-4 ml-1" aria-hidden="true" />
        </Link>
      </Button>
    </nav>
  );
}
