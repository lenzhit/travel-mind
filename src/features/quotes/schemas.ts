import { z } from "zod";
export const quoteInputSchema = z.object({
  packageId: z.string().uuid(), variantId: z.string().uuid().optional(),
  travelers: z.number().int().min(1).max(20),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();
export type QuoteInput = z.infer<typeof quoteInputSchema>;
