import type { NextRequest } from "next/server";
import { visitorHandler } from "@/server/services/visitor-http";
import { readAdminBody } from "@/server/services/admin-http";
import { chatInputSchema } from "@/features/chat/schemas";
import { recommend } from "@/server/services/recommendation.service";
import { db } from "@/server/db";
import { consultationRuns } from "@/server/db/schema";
import { scheduleBusinessDispatch } from "@/server/workflows/business-events";
export async function POST(request: NextRequest) {
  return visitorHandler(request, async (sessionId, correlationId) => {
    const started = performance.now();
    const result = await recommend(await readAdminBody(request, chatInputSchema));
    try {
      await db.insert(consultationRuns).values({ sessionId, correlationId, aiMode: result.mode, retrievalMode: result.retrieval, recommendationCount: result.recommendations.length, responseDurationMs: Math.round(performance.now() - started) });
      scheduleBusinessDispatch();
    } catch {
      console.warn(JSON.stringify({ event: "consultation_telemetry_failed", correlation_id: correlationId, mode: "demo" }));
    }
    console.log(JSON.stringify({ event: "recommendations_returned", correlation_id: correlationId, mode: "demo", ai: result.mode, retrieval: result.retrieval, count: result.recommendations.length, duration_ms: Math.round(performance.now() - started) }));
    return result;
  });
}
