import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertLocalDemo, login, logout, SESSION_COOKIE, SESSION_SECONDS } from "@/server/services/admin-auth";
import { adminErrorResponse, adminHandler, readAdminBody } from "@/server/services/admin-http";
export async function POST(request: NextRequest) {
  try {
    assertLocalDemo(request, true);
    const { password } = await readAdminBody(request, z.object({ password: z.string().min(12).max(256) }).strict());
    const token = await login(password);
    const response = NextResponse.json({ data: { role: "admin" } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: SESSION_SECONDS });
    return response;
  } catch (error) { return adminErrorResponse(error); }
}
export async function GET(request: NextRequest) { return adminHandler(request, async () => ({ role: "admin" })); }
export async function DELETE(request: NextRequest) {
  try {
    assertLocalDemo(request, true);
    await logout(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ data: { signedOut: true } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return adminErrorResponse(error); }
}
