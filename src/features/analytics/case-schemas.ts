import { z } from "zod";
export const caseQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(200).default(1) }).strict();
export const operationCasesSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), status: z.string(), reason: z.string().nullable(), packageTitle: z.string(), totalMinor: z.number().int().nonnegative(), currency: z.literal("USD"), updatedAt: z.string(), assignee: z.string().nullable(), history: z.array(z.object({ action: z.string(), reason: z.string(), createdAt: z.string() })), payments: z.array(z.object({ status: z.string(), refundStatus: z.string(), totalMinor: z.number().int().nonnegative() })) })),
  page: z.number().int().positive(), hasMore: z.boolean(), simulated: z.literal(true), canAssign: z.boolean(),
});
export type OperationCases = z.infer<typeof operationCasesSchema>;
export const caseActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign"), assignee: z.string().trim().min(3).max(32), reason: z.string().trim().min(5).max(500), expectedUpdatedAt: z.iso.datetime() }).strict(),
  z.object({ action: z.enum(["note", "close_unpaid", "cancel_unverified", "request_mock_refund"]), reason: z.string().trim().min(5).max(500), expectedUpdatedAt: z.iso.datetime() }).strict(),
]);
export type CaseActionInput = z.infer<typeof caseActionSchema>;
