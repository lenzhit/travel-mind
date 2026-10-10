import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { customerSessions } from "@/server/db/schema";
import { authenticateCustomer, CUSTOMER_COOKIE, CUSTOMER_SECONDS, requireAccount } from "@/server/services/customer-auth";
import { customerAuthSchema } from "@/features/customer/schemas";
import { assertLocalDemo, tokenHash } from "@/server/services/admin-auth";
import { requireVisitor, VISITOR_COOKIE } from "@/server/services/visitor-session";
import { readAdminBody, adminErrorResponse } from "@/server/services/admin-http";
export async function POST(request: NextRequest) {
  try {
    assertLocalDemo(request, true);
    const visitorId = await requireVisitor(request.cookies.get(VISITOR_COOKIE)?.value, true);
    const { token, customer } = await authenticateCustomer(await readAdminBody(request, customerAuthSchema), visitorId);
    const response = NextResponse.json({ data: customer }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(CUSTOMER_COOKIE, token, { path: "/", httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:", maxAge: CUSTOMER_SECONDS });
    return response;
  } catch (error) { return adminErrorResponse(error); }
}
export async function GET(request: NextRequest) {
  try {
    const actor = await requireAccount(request.cookies.get(CUSTOMER_COOKIE)?.value);
    return NextResponse.json({ data: { username: actor.username, role: actor.role } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return adminErrorResponse(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    assertLocalDemo(request, true);
    const token = request.cookies.get(CUSTOMER_COOKIE)?.value;
    if (token) await db.delete(customerSessions).where(eq(customerSessions.tokenHash, tokenHash(token)));
    const response = NextResponse.json({ data: { signedOut: true } });
    response.cookies.delete(CUSTOMER_COOKIE); response.cookies.delete(VISITOR_COOKIE);
    return response;
  } catch (error) { return adminErrorResponse(error); }
}
