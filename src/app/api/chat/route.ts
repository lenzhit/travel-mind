import type { NextRequest } from "next/server";
import { visitorHandler } from "@/server/services/visitor-http";
import { readAdminBody } from "@/server/services/admin-http";
import { chatInputSchema } from "@/features/chat/schemas";
import { recommend } from "@/server/services/recommendation.service";
export async function POST(request: NextRequest) {
  return visitorHandler(request, async (_sessionId, correlationId) => {
    const started = performance.now();
    const result = await recommend(await readAdminBody(request, chatInputSchema));
    console.log(JSON.stringify({ event: "recommendations_returned", correlation_id: correlationId, mode: "demo", ai: result.mode, retrieval: result.retrieval, count: result.recommendations.length, duration_ms: Math.round(performance.now() - started) }));
    return result;
  });
}
