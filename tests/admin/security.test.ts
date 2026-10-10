import { describe, expect, it } from "vitest";
import { scryptSync } from "node:crypto";
import { assertLocalDemo, consumeLoginAttempt, verifyPassword } from "@/server/services/admin-auth";
import { adminPackageSchema } from "@/features/admin/schemas";
import { readAdminBody } from "@/server/services/admin-http";
import { z } from "zod";

describe("Controles de administración local", () => {
  it("verifica el hash y rechaza una contraseña incorrecta o configuración inválida", () => {
    const salt = "a".repeat(32);
    const encoded = `${salt}:${scryptSync("demo-test-password", salt, 64).toString("hex")}`;
    expect(verifyPassword("demo-test-password", encoded)).toBe(true);
    expect(verifyPassword("incorrect-password", encoded)).toBe(false);
    expect(verifyPassword("demo-test-password", "malformed")).toBe(false);
  });
  it("rechaza mutaciones sin Origin y desde otro sitio", () => {
    expect(() => assertLocalDemo(new Request("http://localhost:3000/admin"), true)).toThrow("Origen");
    expect(() => assertLocalDemo(new Request("http://localhost:3000/admin", { headers: { Origin: "https://example.test" } }), true)).toThrow("Origen");
    expect(() => assertLocalDemo(new Request("http://localhost:3000/admin", { headers: { Origin: "http://localhost:3000" } }), true)).not.toThrow();
    expect(() => assertLocalDemo(new Request("https://example.test/admin"))).toThrow("no está habilitado");
  });
  it("limita intentos y permite volver a intentarlo después de la ventana", () => {
    for (let i = 0; i < 10; i++) consumeLoginAttempt(100000);
    expect(() => consumeLoginAttempt(100000)).toThrow("Demasiados");
    expect(() => consumeLoginAttempt(160000)).not.toThrow();
  });
  it("no admite importes fraccionarios ni campos fuera del contrato", () => {
    expect(adminPackageSchema.shape.basePriceMinor.safeParse(123.5).success).toBe(false);
    expect(adminPackageSchema.shape.basePriceMinor.safeParse(-1).success).toBe(false);
    expect(adminPackageSchema.shape.basePriceMinor.safeParse(2147483648).success).toBe(false);
  });
  it("rechaza JSON roto y limita el cuerpo real sin confiar en Content-Length", async () => {
    const request = (body: string) => new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    await expect(readAdminBody(request("{"), z.object({}))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(readAdminBody(request("x".repeat(65537)), z.object({}))).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
});
