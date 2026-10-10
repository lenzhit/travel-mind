/**
 * Módulo de Catálogo de Paquetes Turísticos (Fase 1 placeholder)
 * Contendrá la lógica de dominio, componentes y contratos del catálogo.
 */

export interface PackageSummary {
  id: string;
  title: string;
  destination: string;
  priceMinor: number;
  currency: string;
  durationDays: number;
}
