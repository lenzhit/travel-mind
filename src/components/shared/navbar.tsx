"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/packages", label: "Paquetes" },
  { href: "/chat", label: "Asistente de viajes" },
  { href: "/#destinos", label: "Destinos" },
  { href: "/reservations", label: "Mis reservas" },
  { href: "/account", label: "Mi cuenta" },
];
const linkClass = "rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
    <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 sm:px-6">
      <Link href="/" aria-label="TravelMind, inicio" className="flex items-center gap-2.5 rounded-md text-xl font-bold text-primary focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Compass className="size-6" aria-hidden="true" /></span>
        <span>Travel<span className="text-accent">Mind</span></span>
      </Link>
      <nav aria-label="Navegación principal" className="hidden items-center gap-2 xl:flex">
        {navigation.map(item => <Link key={item.href} href={item.href} className={linkClass}>{item.label}</Link>)}
      </nav>
      <Button asChild className="hidden xl:inline-flex"><Link href="/packages">Explorar viajes</Link></Button>
      <button type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Cerrar menú principal" : "Abrir menú principal"} onClick={() => setOpen(!open)} className="flex size-11 items-center justify-center rounded-md border xl:hidden focus-visible:ring-2 focus-visible:ring-ring">
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Navegación móvil" className="flex flex-col gap-2 border-t px-4 py-4 xl:hidden">
      {navigation.map(item => <Link key={item.href} href={item.href} className={linkClass} onClick={() => setOpen(false)}>{item.label}</Link>)}
    </nav>}
  </header>;
}
