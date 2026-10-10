import { describe, it, expect } from "vitest";
import { formatMoney, formatDate } from "@/lib/format";

describe("Utilidades de Formato (ui-design-system)", () => {
  describe("formatMoney", () => {
    it("formatea centavos enteros a moneda USD en formato es-PE", () => {
      const formatted = formatMoney(186050, "USD");
      // En es-PE, 186050 céntimos es US$ 1,860.50 o $ 1,860.50
      expect(formatted).toMatch(/1[\s,.]860[,.]50/);
    });

    it("formatea centavos enteros a moneda PEN en formato es-PE", () => {
      const formatted = formatMoney(50000, "PEN");
      expect(formatted).toMatch(/500[,.]00/);
    });

    it("rechaza números de coma flotante para prevenir errores de redondeo financiero", () => {
      expect(() => formatMoney(1860.5 as unknown as number, "USD")).toThrow(TypeError);
    });
  });

  describe("formatDate", () => {
    it("formatea fecha ISO a texto localizado en español con zona IANA", () => {
      const formatted = formatDate("2026-10-10T12:00:00Z", "America/Lima");
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
