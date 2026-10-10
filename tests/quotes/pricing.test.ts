import { describe, expect, it } from "vitest";
import type { PackageDetail } from "@/features/catalog";
import { MockTravelProvider, validateDepartureDate } from "@/server/providers/mock-travel-provider";
const now = new Date("2026-10-10T12:00:00Z");
const pkg = { id: "fixture", title: "Fixture", basePriceMinor: 100000, currency: "USD", updatedAt: now, inclusions: [], exclusions: [], variants: [{ id: "variant", status: "active", priceMinor: 12345, capacity: 2, name: "Fixture opción" }] } as unknown as PackageDetail;
const input = { packageId: "fixture", travelers: 2, departureDate: "2027-01-12" };
describe("Tarifa y fecha verificables", () => {
  it("calcula unidades menores y aplica exactamente > USD 2000", () => {
    const provider = new MockTravelProvider();
    expect(provider.quote(pkg, input, now)).toMatchObject({ totalMinor: 200000, requiresApproval: false, availability: "requires_reconfirmation" });
    expect(provider.quote({ ...pkg, basePriceMinor: 100001 }, input, now)).toMatchObject({ totalMinor: 200002, requiresApproval: true });
    expect(provider.quote(pkg, { ...input, variantId: "variant" }, now).totalMinor).toBe(24690);
  });
  it("rechaza capacidad insuficiente y variante ajena", () => {
    expect(() => new MockTravelProvider().quote(pkg, { ...input, variantId: "variant", travelers: 3 }, now)).toThrow("cantidad de viajeros");
    expect(() => new MockTravelProvider().quote(pkg, { ...input, variantId: "foreign" }, now)).toThrow("no está disponible");
  });
  it("rechaza fechas imposibles, pasadas y aplica el día de Lima", () => {
    expect(() => validateDepartureDate("2027-02-29", now)).toThrow();
    expect(() => validateDepartureDate("2026-10-09", now)).toThrow();
    expect(() => validateDepartureDate("2026-10-09", new Date("2026-10-10T02:00:00Z"))).not.toThrow();
  });
  it("rechaza monedas sin conversión y overflow", () => {
    expect(() => new MockTravelProvider().quote({ ...pkg, currency: "PEN" }, input, now)).toThrow("conversión");
    expect(() => new MockTravelProvider().quote({ ...pkg, basePriceMinor: 2147483647 }, input, now)).toThrow("revisión");
  });
});
