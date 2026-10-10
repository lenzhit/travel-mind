import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("debe responder con estado 200, cabecera no-store y la estructura de salud esperada en modo demo", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    // Verificación de cabeceras de no-almacenamiento
    const cacheControl = response.headers.get("cache-control");
    expect(cacheControl).toContain("no-store");

    const data = await response.json();
    expect(data).toHaveProperty("status", "ok");
    expect(data).toHaveProperty("service", "travel-mind");
    expect(data).toHaveProperty("version", "0.1.0");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("mode", "demo");
    expect(data.checks).toEqual({
      budgetPolicy: "USD_0",
      aiProvider: "ollama",
      travelProvider: "mock",
      paymentProvider: "mock",
    });
  });
});
