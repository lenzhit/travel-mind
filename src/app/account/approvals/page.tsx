import { Suspense } from "react";
import { AccountAccess } from "@/components/shared/account-access";
import ApprovalList from "@/components/features/approvals/approval-list";
export default function ApprovalsPage() {
  return <Suspense fallback={<p role="status" className="p-6">Comprobando permisos…</p>}><AccountAccess roles={["admin", "approver"]}><ApprovalList /></AccountAccess></Suspense>;
}
