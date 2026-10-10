import { ReservationDetail } from "@/components/features/reservations/reservation-detail";
import { Suspense } from "react";
async function Content({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ReservationDetail id={id} />; }
export default function Page({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<p role="status" className="p-8">Consultando solicitud…</p>}><Content params={params} /></Suspense>; }
