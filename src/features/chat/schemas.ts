import { z } from "zod";
export const chatInputSchema = z.object({
  message: z.string().trim().min(3).max(1000),
  destinationId: z.string().uuid().optional(),
  travelers: z.number().int().min(1).max(20).optional(),
  budgetMinor: z.number().int().min(1).max(2147483647).optional(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();
export type ChatInput = z.infer<typeof chatInputSchema>;
export interface Recommendation {
  id: string; title: string; slug: string; destination: string; durationDays: number;
  priceMinor: number; currency: "USD"; reason: string;
  sources: { id: string; title: string; uri: string; version: number; approvedAt: string; excerpt: string }[];
}
export interface ChatResult {
  message: string; recommendations: Recommendation[]; questions: string[];
  mode: "ollama" | "deterministic"; retrieval: "semantic" | "catalog";
  preferences: { travelers?: number; budgetMinor?: number; departureDate?: string; destinationId?: string };
}
