"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prepareVisitor, requestData } from "@/features/visitor/client";
import { formatMoney } from "@/lib/format";
export const fieldClass = "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function QuoteForm({ packageId, variants = [], initialTravelers = 1, initialDate = "" }: { packageId: string; variants?: { id: string; name: string; priceMinor: number; capacity: number }[]; initialTravelers?: number; initialDate?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const payload = JSON.stringify({ packageId, travelers: Number(fields.get("travelers")), departureDate: fields.get("departureDate"), ...(fields.get("variantId") ? { variantId: fields.get("variantId") } : {}) });
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      await prepareVisitor();
      const quote = await requestData<{ id: string }>("/api/quote", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key }, body: payload });
      router.push(`/quotes/${quote.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo cotizar. Intenta nuevamente."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4" aria-label="Solicitar cotización" aria-busy={busy}>
    <label className="block space-y-1.5 text-sm font-medium"><span>Fecha de salida</span><input name="departureDate" type="date" required defaultValue={initialDate} className={fieldClass} /></label>
    <label className="block space-y-1.5 text-sm font-medium"><span>Viajeros</span><input name="travelers" type="number" min="1" max="20" required defaultValue={initialTravelers} className={fieldClass} /></label>
    {variants.length > 0 && <label className="block space-y-1.5 text-sm font-medium"><span>Opción del viaje</span><select name="variantId" className={fieldClass}><option value="">Tarifa base</option>{variants.map(item => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.priceMinor, "USD")} · hasta {item.capacity} viajeros</option>)}</select></label>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button type="submit" disabled={busy} className="w-full">{busy ? "Preparando cotización…" : "Solicitar cotización"}</Button>
    <p className="text-xs text-muted-foreground">Cotización válida por 24 horas. El precio y los cupos se reconfirmarán antes de reservar.</p>
  </form>;
}
