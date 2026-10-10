import type { Currency } from "@/types";

/**
 * Formatea un valor monetario expresado en céntimos/unidad menor entera a formato localizado es-PE.
 * Sigue la regla obligatoria de no usar floats en dinero y siempre indicar la moneda ISO.
 *
 * @param priceMinor Monto en unidad menor (ej. 186050 para USD 1,860.50)
 * @param currency Código de moneda ISO 4217 (ej. "USD", "PEN", "EUR")
 */
export function formatMoney(priceMinor: number, currency: Currency): string {
  if (!Number.isInteger(priceMinor)) {
    throw new TypeError(`El monto priceMinor debe ser un entero de unidad menor, recibido: ${priceMinor}`);
  }

  const decimalValue = priceMinor / 100;
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalValue);
}

/**
 * Formatea una fecha a texto localizado inequívoco en español con zona horaria explícita.
 *
 * @param date Fecha como objeto Date o string ISO
 * @param timeZone Zona horaria IANA (por defecto America/Lima)
 */
export function formatDate(
  date: string | Date,
  timeZone: string = "America/Lima"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(d);
}
