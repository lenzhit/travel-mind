import { z } from "zod";
export const customerAuthSchema = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,32}$/), password: z.string().min(12).max(128), action: z.enum(["register", "login"]) }).strict();
