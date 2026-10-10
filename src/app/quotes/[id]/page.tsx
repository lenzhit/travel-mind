import { Suspense } from "react";
import type { Metadata } from "next";
import { QuoteDetail } from "@/components/features/quotes/quote-detail";
export const metadata: Metadata = { title: "Tu cotización — TravelMind", robots: { index: false, follow: false } };
async function Content({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <QuoteDetail id={id} />; }
export default function QuotePage({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<p role="status" className="p-8">Cargando cotización…</p>}><Content params={params} /></Suspense>; }
