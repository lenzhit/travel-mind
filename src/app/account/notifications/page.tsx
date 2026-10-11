import { Suspense } from "react";
import { AccountAccess } from "@/components/shared/account-access";
import { NotificationRetries } from "@/components/features/analytics/notification-retries";

export default function NotificationsPage() {
  return <Suspense fallback={<p role="status" className="p-6">Comprobando permisos…</p>}><AccountAccess roles={["admin"]}><NotificationRetries /></AccountAccess></Suspense>;
}
