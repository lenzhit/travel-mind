"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestData } from "@/features/visitor/client";
import { exhaustedNotificationsSchema } from "@/features/analytics/notification-schemas";
import type { z } from "zod";

type List = z.infer<typeof exhaustedNotificationsSchema>;

export function NotificationRetries() {
  const [data, setData] = useState<List | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let active = true;
    requestData<unknown>("/api/admin/notifications").then(value => { if (active) { setData(exhaustedNotificationsSchema.parse(value)); setError(""); } }).catch(() => { if (active) setError("No pudimos consultar las entregas agotadas."); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  return <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
    <Link href="/account/operations" className="rounded text-accent underline focus-visible:ring-2 focus-visible:ring-ring">← Resumen operativo</Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold text-primary">Entregas agotadas</h1><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Actualizar entregas</Button></div>
    <p>Solo se reabren notificaciones de prueba tras revisar el servicio local. Una respuesta perdida de Mailpit podría haber generado ya un correo: comprueba la bandeja antes de reintentar.</p>
    {notice && <p role="status">{notice}</p>}
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded border border-danger p-3 text-danger">{error}</p>}
    {!data && !error && <p role="status">Consultando entregas…</p>}
    {data && <section aria-label="Notificaciones agotadas" className="space-y-4">{data.items.length === 0 && <p role="status">No hay entregas agotadas.</p>}{data.items.map(item => <RetryForm key={item.id} item={item} onQueued={() => { setNotice("Entrega reabierta. El siguiente ciclo local intentará enviarla."); setRevision(value => value + 1); }} />)}{data.hasMore && <p role="status">Hay más de veinte entregas. Atiende las visibles y actualiza la lista.</p>}</section>}
  </div>;
}

function RetryForm({ item, onQueued }: { item: List["items"][number]; onQueued: () => void }) {
  const [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const retry = useRef<{ body: string; key: string } | null>(null);
  return <form className="space-y-3 rounded-xl border bg-surface p-5" aria-label={`Reintentar entrega ${item.id}`} onSubmit={async event => {
    event.preventDefault(); if (busy || !confirmed) return;
    const body = JSON.stringify({ reason, confirmed: true });
    if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
    setBusy(true); setError("");
    try { await requestData(`/api/admin/notifications/${item.id}/retry`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": retry.current.key }, body }); onQueued(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo reabrir la entrega."); }
    finally { setBusy(false); }
  }}>
    <h2 className="font-semibold text-primary">{item.channel === "email" ? "Correo de prueba" : "WhatsApp simulado"} · {item.attempts} intentos</h2>
    <p className="break-all text-sm">Solicitud: {item.reservationId}</p>
    <label htmlFor={`retry-reason-${item.id}`} className="block text-sm">Motivo de reintento</label>
    <textarea id={`retry-reason-${item.id}`} required minLength={5} maxLength={500} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} aria-describedby={`retry-privacy-${item.id}`} className="w-full rounded border bg-background p-3 focus-visible:ring-2 focus-visible:ring-ring" />
    <p id={`retry-privacy-${item.id}`} className="text-sm text-muted-foreground">No incluyas datos personales ni bancarios. La decisión quedará auditada.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} className="mt-1 focus-visible:ring-2 focus-visible:ring-ring" />He comprobado la bandeja local y autorizo un nuevo intento simulado.</label>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <Button type="submit" disabled={busy || !confirmed}>{busy ? "Guardando…" : "Reabrir entrega"}</Button>
  </form>;
}
