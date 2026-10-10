import type { PackageDetail } from "@/features/catalog";
import type { QuoteInput } from "@/features/quotes/schemas";
import type { QuoteSnapshot } from "@/server/db/schema";
import { AdminError } from "@/server/services/admin-errors";

export function validateDepartureDate(value: string, now = new Date()) {
  const parsed = new Date(`${value}T12:00:00Z`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value < today) throw new AdminError("INVALID_DATE", "Selecciona una fecha válida que no haya pasado.", 422);
}
export class MockTravelProvider {
  readonly name = "mock";
  readonly isMock = true;
  quote(pkg: PackageDetail, input: QuoteInput, now = new Date()): QuoteSnapshot {
    validateDepartureDate(input.departureDate, now);
    if ((process.env.APP_MODE || "demo") !== "demo" || (process.env.TRAVEL_PROVIDER || "mock") !== "mock") throw new AdminError("PROVIDER_UNAVAILABLE", "La cotización no está disponible en este entorno.", 503);
    if (pkg.currency !== "USD") throw new AdminError("UNSUPPORTED_CURRENCY", "Esta moneda requiere una tarifa y conversión verificadas.", 422);
    const variant = input.variantId ? pkg.variants.find(item => item.id === input.variantId && item.status === "active") : null;
    if (input.variantId && !variant) throw new AdminError("VARIANT_UNAVAILABLE", "La opción seleccionada no está disponible.", 422);
    if (variant && input.travelers > variant.capacity) throw new AdminError("PARTY_TOO_LARGE", "La opción seleccionada no admite esa cantidad de viajeros.", 422);
    const unitPriceMinor = variant?.priceMinor ?? pkg.basePriceMinor;
    const subtotalMinor = unitPriceMinor * input.travelers;
    if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor > 2147483647 || subtotalMinor < 0) throw new AdminError("PRICE_OUT_OF_RANGE", "El importe requiere revisión antes de cotizar.", 422);
    // Política explícita de tarifa íntegra del catálogo mock: no cargos separados.
    return { packageId: pkg.id, packageTitle: pkg.title, packageUpdatedAt: pkg.updatedAt.toISOString(), variantId: variant?.id ?? null, variantName: variant?.name ?? null, departureDate: input.departureDate, travelers: input.travelers, unitPriceMinor, subtotalMinor, taxesMinor: 0, feesMinor: 0, discountMinor: 0, totalMinor: subtotalMinor, currency: "USD", source: "MockTravelProvider/catalog", pricingPolicy: "catalog-inclusive-v1", availability: "requires_reconfirmation", requiresApproval: subtotalMinor > 200000, inclusions: pkg.inclusions, exclusions: pkg.exclusions };
  }
}
