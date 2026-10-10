import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/server/workflows/maintenance", () => ({ runMaintenance: vi.fn(async () => ({ checked: 0, completed: 0 })) }));
import { POST } from "@/app/api/internal/workflows/process/route";
import { runMaintenance } from "@/server/workflows/maintenance";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = (token?: string) => new NextRequest("http://localhost:3000/api/internal/workflows/process", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
describe("Identidad de servicio local", () => {
  it("rechaza token ausente, incorrecto o deshabilitado antes de procesar la cola", async () => {
    vi.stubEnv("WORKFLOW_INTERNAL_TOKEN", "a".repeat(32));
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("b".repeat(32)))).status).toBe(401);
    expect((await POST(request("short"))).status).toBe(401);
    vi.stubEnv("WORKFLOW_INTERNAL_TOKEN", "");
    expect((await POST(request("a".repeat(32)))).status).toBe(401);
    expect(runMaintenance).not.toHaveBeenCalled();
  });
  it("admite el token system en demo y bloquea el procesamiento en producción", async () => {
    vi.stubEnv("WORKFLOW_INTERNAL_TOKEN", "a".repeat(32)); vi.stubEnv("APP_MODE", "demo");
    const response = await POST(request("a".repeat(32)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { checked: 0, completed: 0 } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(runMaintenance).toHaveBeenCalledOnce();
    vi.stubEnv("APP_MODE", "production");
    expect((await POST(request("a".repeat(32)))).status).toBe(403);
    expect(runMaintenance).toHaveBeenCalledOnce();
  });
});
