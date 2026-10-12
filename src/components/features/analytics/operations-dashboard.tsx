"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestData } from "@/features/visitor/client";
import { operationalMetricsSchema, type OperationalMetrics } from "@/features/analytics/schemas";

const labels: Record<string, string> = { pending_approval: "Pendiente de aprobación", pending_payment: "Pendiente de pago", payment_processing: "Pago en proceso", pending_provider: "Verificando proveedor", confirmed_demo: "Confirmación simulada", rejected: "Rechazada", expired: "Vencida", failed: "Fallida", manual_review: "Revisión manual", refund_pending: "Reversión pendiente", refunded: "Reversión completada", cancelled: "Cancelada" };
const alertLabels: Record<keyof OperationalMetrics["alerts"], string> = { refundPending: "Solicitudes con reversión pendiente", manualReview: "Solicitudes que requieren revisión manual", unreconciledPayments: "Pagos verificados sin resolución por más de 5 minutos", overdueApprovals: "Aprobaciones vencidas por cerrar", failedNotifications: "Entregas de notificación fallidas", exhaustedNotifications: "Entregas con reintentos agotados", delayedWorkflows: "Eventos pendientes por más de 5 minutos" };
const number = (value: number) => value.toLocaleString("es-PE");
const ratio = (numerator: number, denominator: number) => denominator ? `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(numerator * 100 / denominator)} %` : "Sin denominador";
const duration = (milliseconds: number | null) => milliseconds === null ? "Sin muestra" : `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(milliseconds / 1000)} s`;
export function OperationsDashboard() {
  const [data, setData] = useState<OperationalMetrics | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let active = true;
    requestData<unknown>("/api/admin/metrics").then(value => { const snapshot = operationalMetricsSchema.parse(value); if (active) setData(snapshot); }).catch(() => { if (active) setError("No pudimos actualizar el resumen. Intenta nuevamente."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const alerts = data ? Object.entries(data.alerts).filter(([, count]) => count > 0) : [];
  return <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
    <Link href="/account" className="rounded py-2 text-primary underline focus-visible:ring-2 focus-visible:ring-ring">← Mi cuenta</Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-primary">Resumen operativo</h1><p className="mt-2 text-muted-foreground">Seguimiento de solicitudes, aprobaciones y notificaciones.</p></div><Button disabled={busy} onClick={() => { setBusy(true); setError(""); setRevision(value => value + 1); }}>{busy ? "Actualizando…" : "Actualizar resumen"}</Button></div>
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger p-4 text-danger focus-visible:ring-2 focus-visible:ring-ring">{error}{data && " Se muestran los últimos datos recibidos; pueden haber cambiado."}</p>}
    {busy && <p role="status">Consultando el estado de las operaciones…</p>}
    {data && <section aria-busy={busy} aria-label="Estado de las operaciones" className="space-y-8">
      <p className="text-sm text-muted-foreground">Operaciones simuladas del entorno local. Acumulado desde el inicio del registro, incluidos recorridos de QA. No representa ventas ni reservas externas.</p>
      <p role="status" className="text-sm">Última actualización: {new Date(data.generatedAt).toLocaleString("es-PE", { timeZone: "America/Lima" })} (Lima).</p>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Cotizaciones", data.totals.quotations], ["Solicitudes de reserva", data.totals.reservations], ["Confirmaciones simuladas", data.totals.confirmed], ["Aprobaciones pendientes", data.totals.pendingApprovals]].map(([label, count]) => <div key={label} className="rounded-xl border bg-surface p-5"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-3 text-3xl font-bold text-primary">{number(count as number)}</dd></div>)}</dl>
      <section aria-labelledby="cohort-title" className="space-y-2 rounded-xl border bg-surface p-5"><h2 id="cohort-title" className="text-xl font-semibold text-primary">Consultas que llegaron a confirmación de prueba</h2><p className="text-2xl font-bold">{number(data.cohort.confirmedSessions)} / {number(data.cohort.consultedSessions)} sesiones</p><p className="text-sm text-muted-foreground">Ventana de {data.cohort.windowDays} días: sesiones con consulta registrada y, después de ella, una solicitud en estado confirmado simulado. {data.cohort.consultedSessions ? `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(data.cohort.confirmedSessions * 100 / data.cohort.consultedSessions)} % de esta cohorte local.` : "Sin denominador suficiente para calcular porcentaje."} Incluye recorridos QA; no es conversión comercial.</p></section>
      <section aria-labelledby="kpis-title" className="space-y-4 rounded-xl border bg-surface p-5"><h2 id="kpis-title" className="text-xl font-semibold text-primary">Indicadores de los últimos siete días</h2><p className="text-sm text-muted-foreground">Datos de demostración, incluidos los recorridos QA. Cada tasa usa los conteos que aparecen junto a ella.</p><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Consultas registradas", number(data.kpis.consultations)],
        ["Con recomendación automática", `${number(data.kpis.automaticRecommendations)} / ${number(data.kpis.consultations)} · ${ratio(data.kpis.automaticRecommendations, data.kpis.consultations)}`],
        ["Cotizaciones emitidas", number(data.kpis.quotes)],
        ["Cotizaciones con aceptación", `${number(data.kpis.acceptedQuotes)} / ${number(data.kpis.quotes)} · ${ratio(data.kpis.acceptedQuotes, data.kpis.quotes)}`],
        ["Solicitudes de reserva", number(data.kpis.reservations)],
        ["Confirmaciones simuladas", `${number(data.kpis.confirmed)} / ${number(data.kpis.reservations)} · ${ratio(data.kpis.confirmed, data.kpis.reservations)}`],
        ["Reservas en estado fallido o revisión", number(data.kpis.failed)],
        ["Incidencias abiertas / resueltas", `${number(data.kpis.openIncidents)} / ${number(data.kpis.resolvedIncidents)}`],
        ["Notificaciones entregadas", `${number(data.kpis.notificationsSent)} / ${number(data.kpis.notifications)} · ${ratio(data.kpis.notificationsSent, data.kpis.notifications)}`],
        ["Reintentos de eventos", number(data.kpis.eventRetries)],
        ["Eventos de workflow con error", number(data.kpis.workflowErrors)],
        ["Primera respuesta p50 / p95", `${duration(data.kpis.firstResponseP50Ms)} / ${duration(data.kpis.firstResponseP95Ms)} (${number(data.kpis.firstResponseSamples)} muestras)`],
        ["Confirmación p50", `${duration(data.kpis.confirmationP50Ms)} (${number(data.kpis.confirmationSamples)} muestras)`],
        ["Resolución p50", `${duration(data.kpis.resolutionP50Ms)} (${number(data.kpis.resolutionSamples)} muestras)`],
      ].map(([label, value]) => <div key={label} className="rounded-lg border p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold text-primary">{value}</dd></div>)}</dl><p className="text-sm text-muted-foreground">Primera respuesta mide el cálculo de recomendación, no la entrega de red. Confirmación y resolución miden desde la solicitud hasta el último cambio de estado. Los tiempos anteriores a la instrumentación carecen de muestra de primera respuesta.</p></section>
      <section aria-labelledby="attention-title" className="space-y-4 rounded-xl border bg-surface p-5 sm:p-6"><h2 id="attention-title" className="text-xl font-semibold text-primary">Requieren atención</h2>{alerts.length ? <ul className="space-y-3">{alerts.map(([key, count]) => <li key={key} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><span>{alertLabels[key as keyof typeof alertLabels]}</span><strong className="shrink-0 text-danger">{number(count)}</strong></li>)}</ul> : <p>No hay incidencias pendientes según estas comprobaciones.</p>}<p className="text-sm text-muted-foreground">Las entregas con reintentos agotados forman parte de las entregas fallidas.</p></section>
      <section aria-labelledby="states-title" className="space-y-4"><h2 id="states-title" className="text-xl font-semibold text-primary">Estado de las solicitudes</h2>{data.states.length ? <div className="overflow-x-auto rounded-xl border bg-surface"><table className="w-full text-left"><caption className="sr-only">Solicitudes de reserva por estado actual</caption><thead><tr><th scope="col" className="p-4">Estado</th><th scope="col" className="p-4 text-right">Solicitudes</th></tr></thead><tbody>{data.states.map(row => <tr key={row.status} className="border-t"><th scope="row" className="p-4 font-normal">{labels[row.status] ?? row.status}</th><td className="p-4 text-right">{number(row.count)}</td></tr>)}</tbody></table></div> : <p>Todavía no hay solicitudes de reserva.</p>}</section>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/account/cases">Incidencias de reservas</Link></Button><Button asChild variant="outline"><Link href="/account/notifications">Entregas agotadas</Link></Button><Button asChild variant="outline"><Link href="/account/approvals">Revisar solicitudes</Link></Button><Button asChild variant="outline"><Link href="/account/catalog">Gestionar paquetes</Link></Button></div>
    </section>}
  </div>;
}
