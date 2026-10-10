"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteForm, fieldClass } from "@/components/features/quotes/quote-form";
import { prepareVisitor, requestData } from "@/features/visitor/client";
import type { ChatResult } from "@/features/chat/schemas";
import { formatMoney } from "@/lib/format";
export function TravelChat() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (result) heading.current?.focus(); }, [result]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const fields = new FormData(event.currentTarget);
    const travelers = Number(fields.get("travelers"));
    const budget = fields.get("budget");
    const date = fields.get("departureDate");
    setBusy(true); setError(""); setResult(null);
    try {
      await prepareVisitor();
      const data = await requestData<ChatResult>("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, travelers, ...(budget ? { budgetMinor: Math.round(Number(budget) * 100) } : {}), ...(date ? { departureDate: date } : {}) }) });
      setResult(data);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo buscar. Intenta nuevamente."); }
    finally { setBusy(false); }
  }
  return <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
    <div className="max-w-2xl space-y-3"><span className="inline-flex items-center gap-2 text-sm font-semibold text-accent"><MessageCircle className="size-5" aria-hidden="true" />Tu asistente de viajes</span><h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">Cuéntanos el viaje que imaginas</h1><p className="text-muted-foreground">Encuentra experiencias según el destino, tus intereses y el presupuesto de tu grupo.</p></div>
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-busy={busy}>
      <label className="block space-y-2 font-medium"><span>¿Qué te gustaría conocer?</span><textarea required minLength={3} maxLength={1000} value={message} onChange={event => setMessage(event.target.value)} rows={3} placeholder="Quiero conocer Cusco y Machu Picchu, con historia y cultura." className={fieldClass} /></label>
      <div className="flex flex-wrap gap-2">{["Historia y cultura en Cusco", "Naturaleza en la Amazonía", "Playas del norte"].map(text => <button key={text} type="button" onClick={() => setMessage(text)} className="rounded-full border px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{text}</button>)}</div>
      <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2 text-sm font-medium"><span className="block">Viajeros</span><input name="travelers" type="number" min="1" max="20" required defaultValue="2" className={fieldClass} /></label><label className="space-y-2 text-sm font-medium"><span className="block">Presupuesto total (USD), opcional</span><input name="budget" type="number" min="0.01" max="21474836.47" step="0.01" placeholder="Ej. 1500" className={fieldClass} /></label><label className="space-y-2 text-sm font-medium"><span className="block">Fecha de salida, opcional</span><input name="departureDate" type="date" className={fieldClass} /></label></div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Buscando experiencias…" : "Encontrar mi viaje"}</Button>
      <p role="status" className="text-sm text-muted-foreground">{busy ? "Estamos revisando las opciones del catálogo." : "No compartas documentos de identidad ni datos de tarjeta en el chat."}</p>
    </form>
    {result && <section className="space-y-5" aria-labelledby="recommendation-heading"><h2 id="recommendation-heading" ref={heading} tabIndex={-1} className="rounded text-2xl font-bold text-primary focus-visible:ring-2 focus-visible:ring-ring">Opciones para tu viaje</h2><p>{result.message}</p>{result.questions.map(question => <p key={question} className="text-sm text-muted-foreground">{question} Puedes elegirla al cotizar.</p>)}<div className="grid items-start gap-5 lg:grid-cols-3">{result.recommendations.map(item => <article key={item.id} className="space-y-5 rounded-2xl border bg-surface p-5"><div className="space-y-2"><p className="text-sm font-semibold text-accent">{item.destination} · {item.durationDays} días</p><h3 className="text-xl font-bold text-primary">{item.title}</h3><p className="text-sm text-muted-foreground">{item.reason}</p></div><p className="text-2xl font-bold text-primary">{formatMoney(item.priceMinor, "USD")}<span className="block text-xs font-normal text-muted-foreground">por persona · tarifa del catálogo</span></p><Link href={`/packages/${item.id}`} className="inline-flex items-center gap-1 rounded text-sm font-semibold text-accent focus-visible:ring-2 focus-visible:ring-ring">Ver itinerario e inclusiones<ArrowUpRight className="size-4" aria-hidden="true" /></Link><details className="text-sm"><summary className="cursor-pointer rounded py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Fuente de la recomendación</summary>{item.sources.map(source => <div key={source.id} className="space-y-2 py-2 text-muted-foreground"><Link href={source.uri} className="underline">{source.title}</Link><p>{source.excerpt}</p></div>)}</details><div className="border-t pt-5"><QuoteForm packageId={item.id} initialTravelers={result.preferences.travelers} initialDate={result.preferences.departureDate} /></div></article>)}</div></section>}
  </div>;
}
