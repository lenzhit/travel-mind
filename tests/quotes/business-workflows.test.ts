import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/workflows/business", () => ({ workflowHandlers: {
  consultation: vi.fn(async () => ({ processed: 1 })),
  quotation: vi.fn(async () => ({ expired: 2 })),
  reservation: vi.fn(async () => ({ approvalsChecked: 0 })),
  notifications: vi.fn(async () => ({ checked: 0, completed: 0 })),
  exception: vi.fn(async () => ({ alerts: {} })),
} }));
import { POST } from "@/app/api/internal/workflows/jobs/[kind]/route";
import { workflowHandlers } from "@/server/workflows/business";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const invoke = (kind: string, token?: string) => POST(new NextRequest(`http://localhost:3000/api/internal/workflows/jobs/${kind}`, {
  method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
}), { params: Promise.resolve({ kind }) });

describe("Workflows internos acotados", () => {
  it("rechaza solicitudes sin identidad system y entornos no demo", async () => {
    vi.stubEnv("WORKFLOW_INTERNAL_TOKEN", "a".repeat(32)); vi.stubEnv("APP_MODE", "demo");
    expect((await invoke("consultation")).status).toBe(401);
    expect((await invoke("consultation", "b".repeat(32))).status).toBe(401);
    expect(workflowHandlers.consultation).not.toHaveBeenCalled();
    vi.stubEnv("APP_MODE", "production");
    expect((await invoke("consultation", "a".repeat(32))).status).toBe(403);
    expect(workflowHandlers.consultation).not.toHaveBeenCalled();
  });
  it("despacha exactamente el trabajo solicitado y rechaza nombres desconocidos", async () => {
    const token = "a".repeat(32); vi.stubEnv("WORKFLOW_INTERNAL_TOKEN", token); vi.stubEnv("APP_MODE", "demo");
    for (const kind of ["consultation", "quotation", "reservation", "notifications", "exception"] as const) {
      const response = await invoke(kind, token);
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.json()).data).toBeDefined();
      expect(workflowHandlers[kind]).toHaveBeenCalledOnce();
    }
    const missing = await invoke("delete-everything", token);
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("WORKFLOW_NOT_FOUND");
  });
});
