import { NextResponse } from "next/server";
function retired() {
  return NextResponse.json({ error: { code: "ACCOUNT_LOGIN_REQUIRED", message: "Ingresa desde Mi cuenta con tu usuario y contraseña.", correlationId: crypto.randomUUID() } }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
export const GET = retired;
export const POST = retired;
export const DELETE = retired;
