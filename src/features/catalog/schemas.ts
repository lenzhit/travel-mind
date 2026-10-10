import { z } from "zod";

/**
 * Esquema de validación para parámetros de consulta en GET /api/packages
 */
export const packageQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  destinationId: z.string().uuid().optional(),
  category: z
    .enum(["aventura", "cultural", "naturaleza", "gastronomico", "relax"])
    .optional(),
  minPriceMinor: z.coerce.number().int().nonnegative().optional(),
  maxPriceMinor: z.coerce.number().int().nonnegative().optional(),
  durationDays: z.coerce.number().int().positive().max(30).optional(),
  sortBy: z.enum(["price", "duration", "title", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
});

export type PackageQueryInput = z.infer<typeof packageQuerySchema>;

/**
 * Esquema de validación para el identificador en GET /api/packages/:id
 */
export const packageIdParamSchema = z.object({
  id: z.string().trim().min(1).max(100),
});
