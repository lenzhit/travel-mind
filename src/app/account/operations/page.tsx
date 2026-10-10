import { Suspense } from "react";
import { AccountAccess } from "@/components/shared/account-access";
import { OperationsDashboard } from "@/components/features/analytics/operations-dashboard";
export default function OperationsPage() {
  return <Suspense fallback={<p role="status" className="p-6">Comprobando permisos…</p>}><AccountAccess roles={["admin"]}><OperationsDashboard /></AccountAccess></Suspense>;
}
