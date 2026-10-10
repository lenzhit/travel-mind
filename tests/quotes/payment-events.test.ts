import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { MockPaymentProvider } from "@/server/providers/mock-payment-provider";
import { sendMailpit } from "@/server/providers/mailpit-provider";
describe("Proveedores locales", () => {
  it("valida firma, frescura, importe y modalidad sin admitir campos arbitrarios", () => {
    const provider = new MockPaymentProvider("fixture-key");
    const { event, signature } = provider.emit({ id: randomUUID(), totalMinor: 12345, currency: "USD" }, "succeeded", 1000000);
    expect(provider.verify(event, signature, 1000000)).toEqual(event);
    for (const payload of [{ ...event, totalMinor: 1 }, { ...event, livemode: true }, { ...event, simulated: false }, { ...event, role: "admin" }]) expect(() => provider.verify(payload, signature, 1000000)).toThrow();
    expect(() => provider.verify(event, signature, 1300001)).toThrow();
    expect(() => provider.verify(event, "invalid", 1000000)).toThrow();
  });
  it("Mailpit rechaza correos reales y destinos remotos antes de enviar", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    try {
      await expect(sendMailpit("customer@gmail.com", "fixture", randomUUID())).rejects.toThrow();
      vi.stubEnv("MAILPIT_WEB_URL", "https://remote.test");
      await expect(sendMailpit("fixture@example.test", "fixture", randomUUID())).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    } finally { fetcher.mockRestore(); vi.unstubAllEnvs(); }
  });
});
