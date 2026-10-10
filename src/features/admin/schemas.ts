import { z } from "zod";
const lines = z.array(z.string().trim().min(1).max(500)).max(30);
export const adminPackageSchema = z.object({
  destinationId: z.string().uuid(), title: z.string().trim().min(3).max(255),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(10000), durationDays: z.number().int().min(1).max(30),
  category: z.enum(["aventura", "cultural", "naturaleza", "gastronomico", "relax"]),
  basePriceMinor: z.number().int().min(0).max(2147483647), currency: z.literal("USD"),
  inclusions: lines, exclusions: lines,
  itinerary: z.array(z.object({ day: z.number().int().min(1).max(30), title: z.string().trim().min(1).max(255), description: z.string().trim().min(1).max(2000) }).strict()).max(30),
  status: z.enum(["active", "archived"]),
}).strict();
export const updatePackageSchema = adminPackageSchema.extend({ expectedUpdatedAt: z.string().datetime() }).strict();
export type AdminPackageInput = z.infer<typeof adminPackageSchema>;
