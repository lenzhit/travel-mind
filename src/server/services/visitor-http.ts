import { NextRequest, NextResponse } from "next/server";
import { requireVisitor, assertOrigin, VISITOR_COOKIE } from "./visitor-session";
import { adminErrorResponse } from "./admin-http";
export async function visitorHandler(request: NextRequest, operation: (sessionId: string, correlationId: string) => Promise<unknown>, status = 200) {
  const correlationId = crypto.randomUUID();
  try {
    const mutation = request.method !== "GET";
    if (mutation) assertOrigin(request);
    const sessionId = await requireVisitor(request.cookies.get(VISITOR_COOKIE)?.value, mutation);
    const data = await operation(sessionId, correlationId);
    return NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store", "X-Correlation-ID": correlationId } });
  } catch (error) { return adminErrorResponse(error, correlationId); }
}
