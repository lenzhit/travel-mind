export async function requestData<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "No se pudo completar la solicitud.");
  return result.data as T;
}
export async function prepareVisitor() { await requestData("/api/visitor/session", { method: "POST" }); }
