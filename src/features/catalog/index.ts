/**
 * Módulo de Catálogo de Paquetes Turísticos (Fase 1A)
 */

import type { Destination, Package, PackageVariant } from "@/server/db/schema";
export * from "./schemas";

export interface PackageListItem extends Package {
  destination: Destination;
}

export interface PackageDetail extends Package {
  destination: Destination;
  variants: PackageVariant[];
}
