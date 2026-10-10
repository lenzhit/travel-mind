"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { AdminPackageInput } from "@/features/admin/schemas";

type Row = AdminPackageInput & { id: string; updatedAt: string };
type Destination = { id: string; name: string };
const inputClass = "w-full rounded-md border bg-surface p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "No se pudo completar la solicitud.");
  return result.data;
}

export function AdminCatalog() {
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const editTrigger = useRef<HTMLButtonElement | null>(null);

  async function load(nextPage = page) {
    const [items, places] = await Promise.all([api<Row[]>(`/api/admin/packages?page=${nextPage}`), api<Destination[]>("/api/destinations")]);
    setRows(items); setDestinations(places); setPage(nextPage);
  }
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const [items, places] = await Promise.all([api<Row[]>("/api/admin/packages?page=1"), api<Destination[]>("/api/destinations")]);
      if (active) { setAuthenticated(true); setRows(items); setDestinations(places); }
    }).catch((error: Error) => { if (active) setMessage(error.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Ocurrió un error. Intenta nuevamente."); }
    finally { setBusy(false); }
  }

  return <section aria-busy={busy} className="space-y-6">
    <p role="status" aria-live="polite" className="text-primary">{busy ? "Procesando solicitud…" : message}</p>
    {authenticated && <>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={(event) => { editTrigger.current = event.currentTarget; setEditing(null); }}>Nuevo paquete</Button>
        <Button variant="outline" disabled={busy} onClick={() => void run(async () => { await load(); setMessage("Catálogo actualizado."); })}>Recargar</Button>
      </div>
      {editing !== undefined && <PackageEditor key={editing?.id ?? "new"} row={editing} destinations={destinations} busy={busy} onCancel={() => { setEditing(undefined); editTrigger.current?.focus(); }} onSave={(input) => void run(async () => {
        await api(editing ? `/api/admin/packages/${editing.id}` : "/api/admin/packages", editing ? "PATCH" : "POST", editing ? { ...input, expectedUpdatedAt: editing.updatedAt } : input);
        setEditing(undefined); await load(); setMessage("Paquete guardado correctamente.");
      })} />}
      <div className="overflow-x-auto rounded-lg border bg-surface">
        <table className="w-full text-left"><caption className="p-3 text-left font-semibold">Paquetes · página {page}</caption>
          <thead><tr>{["Paquete", "Precio base USD", "Estado", "Acción"].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id} className="border-t"><th scope="row" className="p-3 font-medium">{row.title}</th><td className="p-3">{formatMoney(row.basePriceMinor, row.currency)}</td><td className="p-3">{row.status === "active" ? "Publicado" : "Archivado"}</td><td className="p-3"><Button variant="outline" disabled={busy} onClick={(event) => { editTrigger.current = event.currentTarget; setEditing(row); }} aria-label={`Editar ${row.title}`}>Editar</Button></td></tr>)}</tbody>
        </table>
        {!rows.length && <p className="p-4">No hay paquetes en esta página.</p>}
      </div>
      <div className="flex gap-3"><Button variant="outline" disabled={busy || page === 1} onClick={() => void run(() => load(page - 1))}>Anterior</Button><Button variant="outline" disabled={busy || rows.length < 20} onClick={() => void run(() => load(page + 1))}>Siguiente</Button></div>
    </>}
  </section>;
}

function PackageEditor({ row, destinations, busy, onCancel, onSave }: { row: Row | null; destinations: Destination[]; busy: boolean; onCancel: () => void; onSave: (input: AdminPackageInput) => void }) {
  const [formError, setFormError] = useState("");
  const titleInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => { titleInput.current?.focus(); }, []);
  return <form className="space-y-4 rounded-lg border bg-surface p-5" onSubmit={(event) => {
    event.preventDefault(); setFormError(""); const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const lines = (name: string) => text(name).split("\n").map(line => line.trim()).filter(Boolean);
    const itinerary = lines("itinerary").map((line, index) => { const separator = line.indexOf("|"); return { day: index + 1, title: line.slice(0, separator).trim(), description: line.slice(separator + 1).trim() }; });
    if (lines("itinerary").some(line => !line.includes("|"))) { setFormError("Cada día necesita un título y una descripción separados por |."); return; }
    onSave({ destinationId: text("destinationId"), title: text("title"), slug: text("slug"), description: text("description"), durationDays: Number(text("durationDays")), category: text("category") as AdminPackageInput["category"], basePriceMinor: Number(text("basePriceMinor")), currency: "USD", inclusions: lines("inclusions"), exclusions: lines("exclusions"), itinerary, status: text("status") as AdminPackageInput["status"] });
  }}>
    <h2 className="text-xl font-semibold">{row ? "Editar paquete" : "Crear paquete"}</h2>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">Datos del paquete</legend>
      <label>Título<input ref={titleInput} name="title" required minLength={3} maxLength={255} defaultValue={row?.title} className={inputClass} /></label>
      <label>Identificador de URL<input name="slug" required minLength={3} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={row?.slug} className={inputClass} /></label>
      <label>Destino<select name="destinationId" required defaultValue={row?.destinationId ?? ""} className={inputClass}><option value="" disabled>Selecciona un destino</option>{destinations.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
      <label>Categoría<select name="category" defaultValue={row?.category ?? "cultural"} className={inputClass}>{["aventura", "cultural", "naturaleza", "gastronomico", "relax"].map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Duración en días<input name="durationDays" type="number" min={1} max={30} step={1} required defaultValue={row?.durationDays ?? 1} className={inputClass} /></label>
      <label>Precio base por persona en centavos USD<input name="basePriceMinor" type="number" min={0} max={2147483647} step={1} required defaultValue={row?.basePriceMinor} className={inputClass} /></label>
      <label className="sm:col-span-2">Descripción aprobada<textarea name="description" required minLength={10} maxLength={10000} defaultValue={row?.description} rows={4} className={inputClass} /></label>
      <label>Incluye (uno por línea)<textarea name="inclusions" defaultValue={row?.inclusions.join("\n")} rows={4} className={inputClass} /></label>
      <label>No incluye (uno por línea)<textarea name="exclusions" defaultValue={row?.exclusions.join("\n")} rows={4} className={inputClass} /></label>
      <label className="sm:col-span-2">Itinerario (cada línea: título | descripción)<textarea name="itinerary" defaultValue={row?.itinerary.map(day => `${day.title} | ${day.description}`).join("\n")} rows={4} className={inputClass} /></label>
      <label>Publicación<select name="status" defaultValue={row?.status ?? "active"} className={inputClass}><option value="active">Publicado</option><option value="archived">Archivado</option></select></label>
    </fieldset>
    <p role="alert" className="text-danger">{formError}</p>
    <p className="text-sm text-muted-foreground">Guardar publica el contenido aprobado. Archivar lo retira del catálogo público. No modifica las variantes de precio existentes.</p>
    <div className="flex gap-3"><Button disabled={busy}>Guardar</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
