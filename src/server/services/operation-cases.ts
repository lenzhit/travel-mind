import { and, asc, eq, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { reservations, quotationVersions } from "@/server/db/schema";
import { operationCasesSchema } from "@/features/analytics/case-schemas";
import { caseActor } from "./case-actions";
export async function readOperationCases(page: number, actorId: string) {
  const actor = await caseActor(db, actorId);
  const rows = await db.select({ id: reservations.id, status: reservations.status, reason: reservations.reason, snapshot: quotationVersions.snapshot, updatedAt: reservations.updatedAt, caseUpdatedAt: reservations.caseUpdatedAt,
    assignee: sql<string | null>`(SELECT username FROM customers WHERE id = ${reservations.caseAssigneeId})`,
    history: sql<{ action: string; reason: string; createdAt: string }[]>`COALESCE((SELECT jsonb_agg(h) FROM (SELECT action, reason, created_at AS "createdAt" FROM case_actions WHERE reservation_id = ${reservations.id} ORDER BY created_at DESC, id DESC LIMIT 5) h), '[]'::jsonb)`,
    payments: sql<{ status: string; refundStatus: string; totalMinor: number }[]>`COALESCE((SELECT jsonb_agg(jsonb_build_object('status', p.status, 'refundStatus', p.refund_status, 'totalMinor', p.total_minor) ORDER BY p.created_at, p.id) FROM payments p WHERE p.reservation_id = ${reservations.id}), '[]'::jsonb)`,
  }).from(reservations).innerJoin(quotationVersions, and(eq(quotationVersions.quotationId, reservations.quotationId), eq(quotationVersions.version, reservations.quoteVersion)))
    .where(and(actor.role === "admin" ? undefined : eq(reservations.caseAssigneeId, actorId), or(eq(reservations.status, "manual_review"), eq(reservations.status, "refund_pending"), sql`${reservations.status} NOT IN ('confirmed_demo', 'refund_pending', 'refunded') AND ${reservations.updatedAt} <= now() - interval '5 minutes' AND EXISTS (SELECT 1 FROM payments p WHERE p.reservation_id = ${reservations.id} AND p.status = 'succeeded' AND p.refund_status = 'not_required')`)))
    .orderBy(asc(reservations.updatedAt), asc(reservations.id)).limit(21).offset((page - 1) * 20);
  return operationCasesSchema.parse({ items: rows.slice(0, 20).map(row => ({ id: row.id, status: row.status, reason: row.reason, packageTitle: row.snapshot.packageTitle, totalMinor: row.snapshot.totalMinor, currency: row.snapshot.currency, updatedAt: new Date(Math.max(row.updatedAt.getTime(), row.caseUpdatedAt?.getTime() ?? 0)).toISOString(), assignee: row.assignee, history: row.history, payments: row.payments })), page, hasMore: rows.length > 20, simulated: true, canAssign: actor.role === "admin" });
}
