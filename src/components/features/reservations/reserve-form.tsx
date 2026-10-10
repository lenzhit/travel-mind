"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestData } from "@/features/visitor/client";
import { formatMoney } from "@/lib/format";
type Review = { version: number; totalMinor: number; available: boolean; policy: string };
export function ReserveForm({ quotationId, reservationId, onReview }: { quotationId: string; reservationId?: string; onReview?: () => void }) {
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  return <div className="space-y-4"><Button disabled={busy} onClick={async () => { setBusy(true); setError(""); setReview(null); try { setReview(await requestData<Review>(`/api/quotes/${quotationId}/revalidate`, { method: "POST" })); onReview?.(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Revisar disponibilidad y precio</Button>{review && <form key={`${review.version}-${review.totalMinor}`} className="space-y-4" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError(""); try { const acceptance = { acceptedVersion: review.version, acceptedTotalMinor: review.totalMinor, termsAccepted: true }; const result = await requestData<{ id: string }>(reservationId ? `/api/reservations/${reservationId}/accept` : "/api/reserve", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(reservationId ? acceptance : { ...acceptance, quotationId, travelerName: form.get("name") }) }); router.push(`/reservations/${result.id}`); router.refresh(); if (reservationId) window.location.reload(); } catch (e) { setError((e as Error).message); setReview(null); } finally { setBusy(false); } }}><p className="font-semibold">Total vigente: {formatMoney(review.totalMinor, "USD")}</p><p className="text-sm">{review.policy}</p>{!reservationId && <label className="block text-sm">Nombre del responsable<input name="name" required minLength={2} maxLength={80} autoComplete="name" className="mt-1 w-full rounded border bg-background p-3 focus-visible:ring-2 focus-visible:ring-ring" /></label>}<label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 size-5 shrink-0" />Acepto este total y las condiciones de la solicitud.</label><Button disabled={busy || !review.available} type="submit">{busy ? "Procesando…" : "Aceptar y solicitar reserva"}</Button>{!review.available && <p role="status">No hay cupos verificados para esta solicitud.</p>}</form>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}{!review && <Link href={`/account?returnTo=/quotes/${quotationId}`} className="block text-sm text-accent underline">Ingresar o crear mi cuenta</Link>}</div>;
}
