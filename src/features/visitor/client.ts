export async function requestData<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new RequestError(result.error?.message || "No se pudo completar la solicitud.", response.status);
  return result.data as T;
}
export async function prepareVisitor() { await requestData("/api/visitor/session", { method: "POST" }); }
export class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "RequestError"; }
}
