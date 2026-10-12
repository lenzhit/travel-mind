import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { approvalRequests, businessEvents, caseActions, consultationRuns, notificationDeliveries, payments, quotations, reservationConsents, reservationEvents, reservations, workflowOutbox } from "@/server/db/schema";
import { operationalMetricsSchema } from "@/features/analytics/schemas";

// Una sola sentencia conserva una instantánea coherente. No trae filas con PII.
export async function readOperationalMetrics(correlationId?: string) {
  const started = performance.now();
  const rows = await db.execute(sql`SELECT jsonb_build_object(
    'generatedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'mode', 'demo',
    'totals', jsonb_build_object(
      'quotations', (SELECT count(*) FROM ${quotations}),
      'reservations', (SELECT count(*) FROM ${reservations}),
      'confirmed', (SELECT count(*) FROM ${reservations} WHERE ${reservations.status} = 'confirmed_demo'),
      'pendingApprovals', (SELECT count(*) FROM ${approvalRequests} WHERE ${approvalRequests.status} = 'pending' AND ${approvalRequests.expiresAt} > now())
    ),
    'states', COALESCE((SELECT jsonb_agg(summary ORDER BY summary.status) FROM (SELECT ${reservations.status} AS status, count(*) AS count FROM ${reservations} GROUP BY ${reservations.status}) summary), '[]'::jsonb),
    'cohort', jsonb_build_object(
      'windowDays', 7,
      'consultedSessions', (SELECT count(DISTINCT ${consultationRuns.sessionId}) FROM ${consultationRuns} WHERE ${consultationRuns.createdAt} >= now() - interval '7 days'),
      'confirmedSessions', (SELECT count(DISTINCT ${quotations.sessionId}) FROM ${reservations}
        INNER JOIN ${quotations} ON ${quotations.id} = ${reservations.quotationId}
        WHERE ${reservations.status} = 'confirmed_demo' AND EXISTS (
          SELECT 1 FROM ${consultationRuns}
          WHERE ${consultationRuns.sessionId} = ${quotations.sessionId}
            AND ${consultationRuns.createdAt} >= now() - interval '7 days'
            AND ${consultationRuns.createdAt} <= ${reservations.createdAt}
        ))
    ),
    'kpis', jsonb_build_object(
      'windowDays', 7,
      'consultations', (SELECT count(*) FROM ${consultationRuns} WHERE ${consultationRuns.createdAt} >= now() - interval '7 days'),
      'automaticRecommendations', (SELECT count(*) FROM ${consultationRuns} WHERE ${consultationRuns.createdAt} >= now() - interval '7 days' AND ${consultationRuns.recommendationCount} > 0),
      'quotes', (SELECT count(*) FROM ${quotations} WHERE ${quotations.issuedAt} >= now() - interval '7 days'),
      'acceptedQuotes', (SELECT count(DISTINCT ${reservations.quotationId}) FROM ${reservationConsents} INNER JOIN ${reservations} ON ${reservations.id} = ${reservationConsents.reservationId} INNER JOIN ${quotations} ON ${quotations.id} = ${reservations.quotationId} WHERE ${quotations.issuedAt} >= now() - interval '7 days'),
      'reservations', (SELECT count(*) FROM ${reservations} WHERE ${reservations.createdAt} >= now() - interval '7 days'),
      'confirmed', (SELECT count(*) FROM ${reservations} WHERE ${reservations.createdAt} >= now() - interval '7 days' AND ${reservations.status} = 'confirmed_demo'),
      'failed', (SELECT count(*) FROM ${reservations} WHERE ${reservations.createdAt} >= now() - interval '7 days' AND ${reservations.status} IN ('rejected','failed','expired','manual_review','refund_pending','refunded','cancelled')),
      'openIncidents', (SELECT count(*) FROM ${reservations} WHERE ${reservations.status} IN ('manual_review','refund_pending')),
      'resolvedIncidents', (SELECT count(*) FROM ${reservations} WHERE ${reservations.status} IN ('cancelled','refunded') AND ${reservations.updatedAt} >= now() - interval '7 days' AND EXISTS (SELECT 1 FROM ${caseActions} WHERE ${caseActions.reservationId} = ${reservations.id})),
      'notifications', (SELECT count(*) FROM ${notificationDeliveries} INNER JOIN ${reservationEvents} ON ${reservationEvents.id} = ${notificationDeliveries.eventId} WHERE ${reservationEvents.createdAt} >= now() - interval '7 days'),
      'notificationsSent', (SELECT count(*) FROM ${notificationDeliveries} INNER JOIN ${reservationEvents} ON ${reservationEvents.id} = ${notificationDeliveries.eventId} WHERE ${reservationEvents.createdAt} >= now() - interval '7 days' AND ${notificationDeliveries.status} = 'sent_demo'),
      'eventRetries', (SELECT COALESCE(sum(greatest(${businessEvents.deliveryAttempts} - 1, 0) + greatest(${businessEvents.attempts} - 1, 0)), 0) FROM ${businessEvents} WHERE ${businessEvents.createdAt} >= now() - interval '7 days'),
      'workflowErrors', (SELECT count(*) FROM ${businessEvents} WHERE ${businessEvents.createdAt} >= now() - interval '7 days' AND (${businessEvents.status} = 'dead' OR ${businessEvents.errorCode} IS NOT NULL)),
      'firstResponseSamples', (SELECT count(*) FROM ${consultationRuns} WHERE ${consultationRuns.createdAt} >= now() - interval '7 days' AND ${consultationRuns.responseDurationMs} IS NOT NULL),
      'firstResponseP50Ms', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ${consultationRuns.responseDurationMs}) FROM ${consultationRuns} WHERE ${consultationRuns.createdAt} >= now() - interval '7 days' AND ${consultationRuns.responseDurationMs} IS NOT NULL),
      'firstResponseP95Ms', (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY ${consultationRuns.responseDurationMs}) FROM ${consultationRuns} WHERE ${consultationRuns.createdAt} >= now() - interval '7 days' AND ${consultationRuns.responseDurationMs} IS NOT NULL),
      'confirmationSamples', (SELECT count(*) FROM ${reservations} WHERE ${reservations.createdAt} >= now() - interval '7 days' AND ${reservations.status} = 'confirmed_demo'),
      'confirmationP50Ms', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ${reservations.updatedAt} - ${reservations.createdAt}) * 1000) FROM ${reservations} WHERE ${reservations.createdAt} >= now() - interval '7 days' AND ${reservations.status} = 'confirmed_demo'),
      'resolutionSamples', (SELECT count(*) FROM ${reservations} WHERE ${reservations.status} IN ('cancelled','refunded') AND ${reservations.updatedAt} >= now() - interval '7 days' AND EXISTS (SELECT 1 FROM ${caseActions} WHERE ${caseActions.reservationId} = ${reservations.id})),
      'resolutionP50Ms', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ${reservations.updatedAt} - ${reservations.createdAt}) * 1000) FROM ${reservations} WHERE ${reservations.status} IN ('cancelled','refunded') AND ${reservations.updatedAt} >= now() - interval '7 days' AND EXISTS (SELECT 1 FROM ${caseActions} WHERE ${caseActions.reservationId} = ${reservations.id}))
    ),
    'alerts', jsonb_build_object(
      'refundPending', (SELECT count(*) FROM ${reservations} WHERE ${reservations.status} = 'refund_pending'),
      'manualReview', (SELECT count(*) FROM ${reservations} WHERE ${reservations.status} = 'manual_review'),
      'unreconciledPayments', (SELECT count(DISTINCT ${reservations.id}) FROM ${reservations} INNER JOIN ${payments} ON ${payments.reservationId} = ${reservations.id}
        WHERE ${payments.status} = 'succeeded' AND ${payments.refundStatus} = 'not_required' AND ${reservations.status} NOT IN ('confirmed_demo', 'refund_pending', 'refunded') AND ${reservations.updatedAt} <= now() - interval '5 minutes'),
      'overdueApprovals', (SELECT count(*) FROM ${approvalRequests} WHERE ${approvalRequests.status} = 'pending' AND ${approvalRequests.expiresAt} <= now()),
      'failedNotifications', (SELECT count(*) FROM ${notificationDeliveries} WHERE ${notificationDeliveries.status} = 'failed'),
      'exhaustedNotifications', (SELECT count(*) FROM ${notificationDeliveries} WHERE ${notificationDeliveries.status} = 'failed' AND ${notificationDeliveries.attempts} >= 3),
      'delayedWorkflows', (SELECT count(*) FROM ${workflowOutbox} WHERE ${workflowOutbox.status} = 'pending' AND ${workflowOutbox.createdAt} <= now() - interval '5 minutes')
    )
  ) AS snapshot`);
  const snapshot = operationalMetricsSchema.parse(rows[0]?.snapshot);
  if (correlationId) console.info(JSON.stringify({ timestamp: snapshot.generatedAt, level: "info", event: "operational_metrics_read", correlation_id: correlationId, mode: process.env.NODE_ENV === "test" ? "test" : "demo", duration_ms: Math.round(performance.now() - started) }));
  return snapshot;
}

