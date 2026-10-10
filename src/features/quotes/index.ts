/**
 * Módulo de Cotizaciones Verificables (Fase 2 placeholder)
 * Gestiona el cálculo, desglose y vigencia de cotizaciones (24h).
 */

export interface QuotationSummary {
  id: string;
  totalMinor: number;
  currency: string;
  expiresAt: string;
  status: "draft" | "issued" | "expired" | "superseded";
}
