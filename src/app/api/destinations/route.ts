import { NextResponse } from "next/server";
import { packageService } from "@/server/services/package.service";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";
import type { Destination } from "@/server/db/schema";

export async function GET() {
  const correlationId = crypto.randomUUID();

  try {
    const destinationsList = await packageService.listDestinations();
    const response: ApiSuccessResponse<Destination[]> = {
      data: destinationsList,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Correlation-ID": correlationId,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Error al consultar /api/destinations:`, error);
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar los destinos",
        correlationId,
      },
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
