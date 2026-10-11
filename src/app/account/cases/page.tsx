import { Suspense } from "react";
import { AccountAccess } from "@/components/shared/account-access";
import { OperationsCases } from "@/components/features/analytics/operations-cases";
export default function CasesPage() {
  return <Suspense fallback={<p role="status" className="p-6">Comprobando permisos…</p>}><AccountAccess roles={["admin", "travel_agent"]}><OperationsCases /></AccountAccess></Suspense>;
}
