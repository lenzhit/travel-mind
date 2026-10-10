import { NextRequest, NextResponse } from "next/server";
import { assertOrigin, createVisitor, requireVisitor, VISITOR_COOKIE, VISITOR_SECONDS } from "@/server/services/visitor-session";
import { adminErrorResponse } from "@/server/services/admin-http";
export async function POST(request: NextRequest) {
  try {
    assertOrigin(request);
    const existing = request.cookies.get(VISITOR_COOKIE)?.value;
    if (existing) {
      try { await requireVisitor(existing); return NextResponse.json({ data: { ready: true } }, { headers: { "Cache-Control": "no-store" } }); }
      catch (error) { if (!(error instanceof Error && "status" in error && error.status === 401)) throw error; }
    }
    const { token } = await createVisitor();
    const response = NextResponse.json({ data: { ready: true } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(VISITOR_COOKIE, token, { path: "/", httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:", maxAge: VISITOR_SECONDS });
    return response;
  } catch (error) { return adminErrorResponse(error); }
}
