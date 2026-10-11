import { z } from "zod";

export const retryNotificationSchema = z.object({
  reason: z.string().trim().min(5).max(500),
  confirmed: z.literal(true),
}).strict();

export const exhaustedNotificationsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), reservationId: z.string().uuid(), channel: z.enum(["email", "whatsapp"]), attempts: z.number().int().min(3) })),
  hasMore: z.boolean(),
  simulated: z.literal(true),
});
