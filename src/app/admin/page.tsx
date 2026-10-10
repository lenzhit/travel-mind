import { AdminCatalog } from "@/components/features/admin/admin-catalog";

export default function AdminPage() {
  return <div className="container mx-auto max-w-6xl px-4 py-10">
    <h1 className="text-3xl font-bold text-primary">Administración del catálogo</h1>
    <p className="my-4 text-muted-foreground">Gestiona paquetes, precios, itinerarios y publicación del catálogo.</p>
    <AdminCatalog />
  </div>;
}
