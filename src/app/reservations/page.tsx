"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { requestData } from "@/features/visitor/client";
import { statusLabel } from "@/components/features/reservations/reservation-detail";
export default function ReservationsPage() {
  const [rows, setRows] = useState<{ id: string; status: string; createdAt: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { requestData<typeof rows>("/api/reservations").then(setRows).catch(e => setError(e.message)); }, []);
  return <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10"><h1 className="text-3xl font-bold text-primary">Mis reservas</h1>{error ? <div role="alert"><p>{error}</p><Link href="/account" className="text-accent underline">Ingresar a mi cuenta</Link></div> : rows === null ? <p role="status">Consultando solicitudes…</p> : rows.length === 0 ? <p>No tienes solicitudes todavía. <Link href="/packages" className="text-accent underline">Explorar viajes</Link></p> : <ul className="space-y-4">{rows.map(row => <li key={row.id} className="rounded-xl border bg-surface p-5"><Link href={`/reservations/${row.id}`} className="font-semibold text-primary underline">Solicitud del {new Date(row.createdAt).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}</Link><p className="mt-2">{statusLabel(row.status)}</p><p className="break-all text-xs text-muted-foreground">Referencia: {row.id}</p></li>)}</ul>}</div>;
}
