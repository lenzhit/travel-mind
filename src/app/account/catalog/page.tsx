import { Suspense } from "react";
import Link from "next/link";
import { AccountAccess } from "@/components/shared/account-access";
import { AdminCatalog } from "@/components/features/admin/admin-catalog";
export default function CatalogPage() {
  return <Suspense fallback={<p role="status" className="p-6">Comprobando permisos…</p>}><AccountAccess roles={["admin"]}><div className="container mx-auto max-w-6xl space-y-6 px-4 py-10"><Link href="/account" className="text-accent underline">← Mi cuenta</Link><h1 className="text-3xl font-bold text-primary">Gestionar paquetes</h1><p className="text-muted-foreground">Gestiona precios, itinerarios y publicación del catálogo.</p><AdminCatalog /></div></AccountAccess></Suspense>;
}
