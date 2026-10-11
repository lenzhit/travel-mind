import { sql } from "drizzle-orm";
import { db } from "@/server/db";

// Lotes fijos: conserva cotizaciones, pagos, consentimientos y auditoría.
export async function applyRetention(now = new Date()) {
  return db.transaction(async tx => {
    const sessions = await tx.execute(sql`WITH candidates AS (
      SELECT token_hash FROM customer_sessions WHERE expires_at <= ${now.toISOString()}::timestamptz
      ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ) DELETE FROM customer_sessions WHERE token_hash IN (SELECT token_hash FROM candidates) RETURNING token_hash`);
    const legacy = await tx.execute(sql`WITH candidates AS (
      SELECT token_hash FROM admin_sessions WHERE expires_at <= ${now.toISOString()}::timestamptz
      ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ) DELETE FROM admin_sessions WHERE token_hash IN (SELECT token_hash FROM candidates) RETURNING token_hash`);
    const consultationCutoff = new Date(now.getTime() - 7 * 86400000);
    const consultations = await tx.execute(sql`WITH candidates AS (
      SELECT id FROM consultation_runs WHERE created_at <= ${consultationCutoff.toISOString()}::timestamptz
      ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ) DELETE FROM consultation_runs WHERE id IN (SELECT id FROM candidates) RETURNING id`);
    const visitors = await tx.execute(sql`WITH candidates AS (
      SELECT id FROM visitor_sessions v WHERE expires_at <= ${now.toISOString()}::timestamptz
      AND NOT EXISTS (SELECT 1 FROM customer_sessions s WHERE s.visitor_id = v.id)
      AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.session_id = v.id)
      AND NOT EXISTS (SELECT 1 FROM consultation_runs c WHERE c.session_id = v.id)
      ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ) DELETE FROM visitor_sessions WHERE id IN (SELECT id FROM candidates) RETURNING id`);
    const cutoff = new Date(now.getTime() - 30 * 86400000);
    const names = await tx.execute(sql`WITH candidates AS (
      SELECT id FROM reservations WHERE created_at <= ${cutoff.toISOString()}::timestamptz AND traveler_name IS NOT NULL
      ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ) UPDATE reservations SET traveler_name = NULL WHERE id IN (SELECT id FROM candidates) RETURNING id`);
    return { expiredAccountSessions: sessions.length, expiredLegacySessions: legacy.length, expiredConsultations: consultations.length, expiredVisitors: visitors.length, anonymizedTravelers: names.length };
  });
}
