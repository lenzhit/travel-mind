import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { HealthCheckResponse } from "@/types";

export async function GET() {
  const healthData: HealthCheckResponse = {
    status: "ok",
    service: "travel-mind",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    mode: env.APP_MODE,
    checks: {
      budgetPolicy: "USD_0",
      aiProvider: env.AI_PROVIDER,
      travelProvider: env.TRAVEL_PROVIDER,
      paymentProvider: env.PAYMENT_PROVIDER,
    },
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
