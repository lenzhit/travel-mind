"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestData } from "@/features/visitor/client";
import { operationCasesSchema, type CaseActionInput, type OperationCases } from "@/features/analytics/case-schemas";
const states: Record<string, string> = { manual_review: "Revisión manual", refund_pending: "Reversión pendiente", pending_provider: "Verificación del proveedor pendiente", pending_payment: "Pago pendiente", expired: "Solicitud vencida", failed: "Solicitud fallida", cancelled: "Solicitud cancelada" };
const reasons: Record<string, string> = { price_changed: "Cambió la tarifa. El cliente debe revisar y aceptar la cotización vigente.", payment_amount_mismatch: "El importe recibido no coincide. El pago necesita conciliación; no se confirmó la reserva.", staff_requested_mock_refund: "El personal solicitó una reversión simulada; el mantenimiento local verificará su resultado." };
const paymentLabels: Record<string, string> = { created: "Creado", pending: "Pendiente", succeeded: "Verificado", failed: "Fallido", cancelled: "Cancelado" };
const refundLabels: Record<string, string> = { not_required: "Sin reversión registrada", pending: "Reversión pendiente", refunded: "Reversión simulada completada" };
const money = (value: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(value / 100);
export function OperationsCases() {
  const [notice, setNotice] = useState("");
  const [data, setData] = useState<OperationCases | null>(null);
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let active = true;
    requestData<unknown>(`/api/admin/cases?page=${page}`).then(value => { if (active) setData(operationCasesSchema.parse(value)); }).catch(() => { if (active) setError("No pudimos consultar las incidencias. Intenta nuevamente."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [page, revision]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  function reload(next = page) { setData(null); setError(""); setBusy(true); setPage(next); setRevision(value => value + 1); }
  return <div className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
    <Link href="/account" className="rounded py-2 text-primary underline focus-visible:ring-2 focus-visible:ring-ring">← Mi cuenta</Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold text-primary">Incidencias de reservas</h1><Button disabled={busy} onClick={() => reload()}>{busy ? "Consultando…" : "Actualizar incidencias"}</Button></div>
    <p className="text-muted-foreground">Revisiones manuales, reversiones pendientes y pagos verificados sin resolución por más de cinco minutos.</p>
    <p className="text-sm text-muted-foreground">Operaciones simuladas. Esta consulta no confirma reservas ni autoriza cargos. Las reversiones verificadas se procesan mediante el mantenimiento local. El personal puede cancelar un intento cuyo importe nunca se verificó; las decisiones quedan registradas.</p>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" ref={errorRef} tabIndex={-1} className="rounded-lg border border-danger p-4 text-danger">{error}</p>}
    {busy && <p role="status">Consultando las incidencias…</p>}
    {data && <section aria-label="Incidencias pendientes" className="space-y-4">
      {!data.items.length && <p role="status">No hay incidencias en esta página.</p>}
      {data.items.map(item => <article key={item.id} className="space-y-3 rounded-xl border bg-surface p-5">
        <h2 className="text-lg font-semibold text-primary">{item.packageTitle}</h2>
        <p className="break-all text-sm">Solicitud: {item.id}</p>
        <p className="text-sm">Asignado a: {item.assignee ?? "Sin asignar"}</p>
        <p><strong>{states[item.status] ?? "Requiere conciliación"}</strong> · {money(item.totalMinor)}</p>
        <p>{item.reason && reasons[item.reason] ? reasons[item.reason] : "Revisar la evidencia del pago y del proveedor antes de resolver esta solicitud."}</p>
        <p className="text-sm text-muted-foreground">Último cambio: {new Date(item.updatedAt).toLocaleString("es-PE", { timeZone: "America/Lima" })} (Lima).</p>
        {item.payments.length ? <ul aria-label="Intentos de pago" className="space-y-2 text-sm">{item.payments.map((payment, index) => <li key={index}>Intento {index + 1}: {paymentLabels[payment.status] ?? "En revisión"}, {money(payment.totalMinor)}. {refundLabels[payment.refundStatus] ?? "Reversión en revisión"}.</li>)}</ul> : <p className="text-sm">Sin intentos de pago registrados.</p>}
        {item.history.length > 0 && <details><summary className="cursor-pointer rounded py-2 focus-visible:ring-2 focus-visible:ring-ring">Últimas decisiones</summary><ul className="space-y-2 text-sm">{item.history.map((entry, index) => <li key={index}>{entry.action === "assign" ? "Asignación" : entry.action === "note" ? "Nota" : entry.action === "cancel_unverified" ? "Cancelación sin pago verificado" : entry.action === "request_mock_refund" ? "Reversión simulada solicitada" : "Cierre"}: {entry.reason} · {new Date(entry.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}</li>)}</ul></details>}
        {["manual_review", "refund_pending", "pending_provider"].includes(item.status) && <CaseControls item={item} canAssign={data.canAssign} onSaved={() => { setNotice("Decisión registrada. Se actualizó la cola."); reload(); }} />}
      </article>)}
      <nav aria-label="Páginas de incidencias" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={busy || page === 1} onClick={() => reload(page - 1)}>Anterior</Button><p role="status">Página {data.page}</p><Button variant="outline" disabled={busy || !data.hasMore || page >= 200} onClick={() => reload(page + 1)}>Siguiente</Button></nav>
    </section>}
  </div>;
}

function CaseControls({ item, canAssign, onSaved }: { item: OperationCases["items"][number]; canAssign: boolean; onSaved: () => void }) {
  const [action, setAction] = useState<CaseActionInput["action"]>("note");
  const [assignee, setAssignee] = useState(""), [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const retry = useRef<{ body: string; key: string } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const canClose = item.status === "manual_review" && item.reason === "price_changed" && !item.payments.some(payment => ["created", "pending", "succeeded"].includes(payment.status));
  const canCancelUnverified = item.status === "manual_review" && item.reason === "payment_amount_mismatch" && item.payments.length > 0 && !item.payments.some(payment => payment.status === "succeeded");
  const canRequestMockRefund = item.status === "pending_provider" && item.payments.some(payment => payment.status === "succeeded" && payment.refundStatus === "not_required") && !item.payments.some(payment => ["created", "pending"].includes(payment.status));
  const requiresConfirmation = action === "close_unpaid" || action === "cancel_unverified" || action === "request_mock_refund";
  const field = "w-full rounded-lg border bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring";
  return <form className="space-y-3 border-t pt-4" aria-label={`Atender solicitud ${item.id}`} onSubmit={async event => {
    event.preventDefault(); if (busy || (requiresConfirmation && !consent)) return;
    setBusy(true); setError("");
    const body = JSON.stringify({ action, reason, expectedUpdatedAt: item.updatedAt, ...(action === "assign" ? { assignee } : {}) });
    if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
    try { await requestData(`/api/admin/cases/${item.id}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": retry.current.key }, body }); onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la decisión."); }
    finally { setBusy(false); }
  }}>
    <div className="space-y-1"><label htmlFor={`action-${item.id}`}>Acción</label><select id={`action-${item.id}`} className={field} value={action} disabled={busy} onChange={event => { setAction(event.target.value as CaseActionInput["action"]); setConsent(false); }}><option value="note">Registrar nota</option>{canAssign && <option value="assign">Asignar a un agente</option>}{canClose && <option value="close_unpaid">Cerrar revisión sin pago</option>}{canCancelUnverified && <option value="cancel_unverified">Cancelar intento no verificado</option>}{canRequestMockRefund && <option value="request_mock_refund">Solicitar reversión simulada</option>}</select></div>
    {action === "assign" && <div className="space-y-1"><label htmlFor={`assignee-${item.id}`}>Usuario del agente</label><input id={`assignee-${item.id}`} className={field} required minLength={3} maxLength={32} value={assignee} disabled={busy} onChange={event => setAssignee(event.target.value)} autoComplete="off" /></div>}
    <div className="space-y-1"><label htmlFor={`reason-${item.id}`}>Motivo o nota</label><textarea id={`reason-${item.id}`} className={field} required minLength={5} maxLength={500} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} aria-describedby={`privacy-${item.id}`} /></div>
    <p id={`privacy-${item.id}`} className="text-sm text-muted-foreground">No incluyas documentos, datos bancarios ni información personal de viajeros.</p>
    {requiresConfirmation && <label className="flex items-start gap-2"><input type="checkbox" required checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} className="mt-1 focus-visible:ring-2 focus-visible:ring-ring" /><span>{action === "cancel_unverified" ? "Confirmo que no hay evidencia de pago verificado ni reserva de proveedor. El intento simulado y la solicitud quedarán cancelados." : action === "request_mock_refund" ? "Confirmo que no existe prueba de reserva del proveedor. Solicito la reversión del pago simulado; no se confirma el viaje." : "Confirmo el cierre de esta revisión sin pago. La solicitud quedará cancelada."}</span></label>}
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger p-3 text-danger focus-visible:ring-2 focus-visible:ring-ring">{error}</p>}
    <Button type="submit" disabled={busy || (requiresConfirmation && !consent)}>{busy ? "Guardando…" : "Guardar decisión"}</Button>
  </form>;
}
