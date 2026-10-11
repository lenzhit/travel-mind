import { z } from "zod";
const count = z.number().int().nonnegative();
export const operationalMetricsSchema = z.object({
  generatedAt: z.string().datetime(), mode: z.literal("demo"),
  totals: z.object({ quotations: count, reservations: count, confirmed: count, pendingApprovals: count }),
  cohort: z.object({ windowDays: z.literal(7), consultedSessions: count, confirmedSessions: count }),
  states: z.array(z.object({ status: z.string(), count })),
  alerts: z.object({ refundPending: count, manualReview: count, unreconciledPayments: count, overdueApprovals: count, failedNotifications: count, exhaustedNotifications: count, delayedWorkflows: count }),
}).strict();
export type OperationalMetrics = z.infer<typeof operationalMetricsSchema>;
