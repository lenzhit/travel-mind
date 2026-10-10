"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestData } from "@/features/visitor/client";
import { formatMoney } from "@/lib/format";
type Approval = { id: string; status: string; expiresAt: string; travelerName: string | null; snapshot: { packageTitle: string; totalMinor: number; travelers: number; departureDate: string } };
export default function ApprovalsPage() {
  const [rows, setRows] = useState<Approval[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { requestData<Approval[]>("/api/admin/approvals").then(setRows).catch(e => setError(e.message)); }, [revision]);
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-10"><Link href="/account" className="text-accent underline">← Mi cuenta</Link><h1 className="text-3xl font-bold text-primary">Aprobaciones de reservas</h1>{error && <p role="alert" className="text-danger">{error}</p>}{rows === null ? <p role="status">{error ? "No pudimos consultar las solicitudes." : "Consultando solicitudes…"}</p> : rows.length === 0 ? <p>No hay solicitudes de aprobación.</p> : rows.map(row => <form key={row.id} className="space-y-4 rounded-xl border bg-surface p-6" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); const decision = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value"); setBusy(true); setError(""); try { await requestData(`/api/admin/approvals/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reason: form.get("reason") }) }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); setRevision(v => v + 1); } }}><h2 className="text-xl font-semibold">{row.snapshot.packageTitle}</h2><p>{row.travelerName ?? "Nombre eliminado por retención"} · {row.snapshot.travelers} viajeros · {row.snapshot.departureDate}</p><p>{formatMoney(row.snapshot.totalMinor, "USD")} · {row.status === "pending" ? "Pendiente" : row.status === "approved" ? "Aprobada" : row.status === "rejected" ? "Rechazada" : "Vencida"}</p><p className="text-sm">Vence: {new Date(row.expiresAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}</p>{row.status === "pending" && <><label className="block">Motivo de la decisión<textarea name="reason" required minLength={5} maxLength={500} className="mt-1 w-full rounded border bg-background p-3 focus-visible:ring-2 focus-visible:ring-ring" /></label><Button disabled={busy} type="submit" value="approved">Aprobar</Button><Button disabled={busy} variant="outline" type="submit" value="rejected">Rechazar</Button></>}</form>)}</div>;
}
