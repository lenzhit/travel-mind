"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { QuoteSnapshot } from "@/server/db/schema";
import { requestData } from "@/features/visitor/client";
import { QuoteForm } from "./quote-form";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
type Quote = QuoteSnapshot & { id: string; status: string; issuedAt: string; expiresAt: string; version: number };
export function QuoteDetail({ id }: { id: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let disposed = false;
    requestData<Quote>(`/api/quotes/${id}`).then(data => { if (!disposed) { setQuote(data); setError(""); } }).catch(error => { if (!disposed) setError(error instanceof Error ? error.message : "No se pudo recuperar tu cotización."); });
    return () => { disposed = true; };
  }, [id, revision]);
  useEffect(() => {
    if (!quote) return;
    const update = () => setExpired(quote.status !== "issued" || Date.now() >= Date.parse(quote.expiresAt));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [quote]);
  const date = (value: string) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6"><Link href="/chat" className="rounded text-sm font-medium text-accent focus-visible:ring-2 focus-visible:ring-ring">← Volver al asistente</Link><h1 className="text-3xl font-bold text-primary">Tu cotización de viaje</h1>{error ? <div role="alert" className="space-y-4 rounded-xl border bg-surface p-5"><p>{error}</p><Button onClick={() => setRevision(value => value + 1)}>Volver a intentar</Button><p className="text-sm text-muted-foreground">La cotización está disponible únicamente en el navegador donde la solicitaste.</p></div> : !quote ? <p role="status">Recuperando cotización…</p> : <div className="grid items-start gap-6 md:grid-cols-3"><section className="space-y-6 rounded-2xl border bg-surface p-6 md:col-span-2"><div className="space-y-2"><span role="status" className={`text-sm font-semibold ${expired ? "text-danger" : "text-accent"}`}>{expired ? "Cotización vencida" : "Cotización vigente"}</span><h2 className="text-2xl font-bold text-primary">{quote.packageTitle}</h2><p>{quote.travelers} {quote.travelers === 1 ? "viajero" : "viajeros"} · Salida: {quote.departureDate.split("-").reverse().join("/")}</p>{quote.variantName && <p>{quote.variantName}</p>}<p className="text-sm text-muted-foreground">Emitida: {date(quote.issuedAt)} · Vence: {date(quote.expiresAt)} (hora de Lima)</p></div><dl className="space-y-3">{[["Tarifa por persona", quote.unitPriceMinor], ["Subtotal", quote.subtotalMinor], ["Impuestos adicionales", quote.taxesMinor], ["Tarifas adicionales", quote.feesMinor], ["Descuentos", quote.discountMinor], ["Total del grupo", quote.totalMinor]].map(([label, value]) => <div key={String(label)} className={`flex justify-between gap-4 ${label === "Total del grupo" ? "border-t pt-4 text-xl font-bold text-primary" : "text-sm"}`}><dt>{label}</dt><dd>{formatMoney(Number(value), "USD")}</dd></div>)}</dl><p className="text-sm text-muted-foreground">El desglose usa la tarifa íntegra publicada en el catálogo, sin cargos adicionales separados. La fecha solicitada requiere verificar cupos.</p><div><h3 className="font-semibold">Incluye</h3><ul className="list-inside list-disc text-sm text-muted-foreground">{quote.inclusions.map(item => <li key={item}>{item}</li>)}</ul></div><div><h3 className="font-semibold">No incluye</h3><ul className="list-inside list-disc text-sm text-muted-foreground">{quote.exclusions.map(item => <li key={item}>{item}</li>)}</ul></div><p className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">Esta cotización no confirma una reserva. Antes de reservar se revisarán disponibilidad, tarifa, impuestos y condiciones. No se ha realizado ningún cargo.</p>{quote.requiresApproval && <p className="text-sm">El total requiere revisión de un asesor antes de iniciar una reserva o un pago.</p>}</section><aside className="space-y-4 rounded-2xl border bg-surface p-5"><h2 className="font-bold text-primary">{expired ? "Actualiza tu cotización" : "Revisa los detalles del viaje"}</h2><p className="text-sm text-muted-foreground">{expired ? "Solicita una nueva cotización para consultar la tarifa actual." : "Conserva este enlace en el mismo navegador para volver a consultar el desglose."}</p>{expired && <QuoteForm packageId={quote.packageId} initialTravelers={quote.travelers} initialDate={quote.departureDate} />}<Link href={`/packages/${quote.packageId}`} className="inline-block rounded text-sm font-semibold text-accent focus-visible:ring-2 focus-visible:ring-ring">Consultar itinerario</Link></aside></div>}</div>;
}
