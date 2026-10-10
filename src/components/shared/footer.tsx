import Link from "next/link";
import { Compass } from "lucide-react";

export function Footer() {
  return <footer className="border-t border-border bg-surface">
    <div className="container mx-auto grid gap-8 px-4 py-12 sm:px-6 md:grid-cols-2">
      <div className="space-y-3">
        <Link href="/" className="inline-flex items-center gap-2 rounded-md text-xl font-bold text-primary focus-visible:ring-2 focus-visible:ring-ring"><Compass aria-hidden="true" className="size-6" />TravelMind</Link>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Descubre destinos del Perú y encuentra experiencias para tu próxima aventura.</p>
      </div>
      <nav aria-label="Navegación del pie de página" className="flex flex-wrap items-start gap-6 text-sm text-primary md:justify-end">
        <Link href="/packages" className="rounded-md hover:underline focus-visible:ring-2 focus-visible:ring-ring">Explorar paquetes</Link>
        <Link href="/#destinos" className="rounded-md hover:underline focus-visible:ring-2 focus-visible:ring-ring">Destinos</Link>
      </nav>
    </div>
    <div className="container mx-auto border-t px-4 py-5 text-xs text-muted-foreground sm:px-6">© 2026 TravelMind.</div>
  </footer>;
}
