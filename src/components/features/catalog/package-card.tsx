import React from "react";
import Link from "next/link";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { PackageListItem } from "@/features/catalog";
import type { Currency } from "@/types";

interface PackageCardProps {
  packageItem: PackageListItem;
}

export function PackageCard({ packageItem }: PackageCardProps) {
  const formattedPrice = formatMoney(
    packageItem.basePriceMinor,
    packageItem.currency as Currency
  );

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 group">
      {/* Imagen / Placeholder del Destino */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={packageItem.destination.imageUrl}
          alt={`Paisaje ilustrativo de ${packageItem.destination.name}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="default" className="bg-primary/90 backdrop-blur-sm text-xs">
            <MapPin className="size-3 mr-1" aria-hidden="true" />
            {packageItem.destination.region}
          </Badge>
          <Badge variant="accent" className="capitalize text-xs">
            {packageItem.category}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-5 pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <Clock className="size-3.5 text-accent" aria-hidden="true" />
          <span>{packageItem.durationDays} {packageItem.durationDays === 1 ? "día" : "días"}</span>
          <span>•</span>
          <span>{packageItem.destination.name}</span>
        </div>
        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {packageItem.title}
        </h3>
      </CardHeader>

      <CardContent className="p-5 pt-0 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {packageItem.description}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-3 border-t border-border flex items-center justify-between gap-3 bg-surface/50">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
            Desde
          </span>
          <span className="text-lg font-extrabold text-primary">
            {formattedPrice}
          </span>
        </div>

        <Button asChild size="sm" variant="default" className="gap-1.5">
          <Link href={`/packages/${packageItem.slug}`}>
            Ver Detalle
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
