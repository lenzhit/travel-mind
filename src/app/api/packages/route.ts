import { NextRequest, NextResponse } from "next/server";
import { packageQuerySchema } from "@/features/catalog/schemas";
import { packageService } from "@/server/services/package.service";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";
import type { PackageListItem } from "@/features/catalog";

export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawParams = {
      search: searchParams.get("search") || undefined,
      destinationId: searchParams.get("destinationId") || undefined,
      category: searchParams.get("category") || undefined,
      minPriceMinor: searchParams.get("minPriceMinor") || undefined,
      maxPriceMinor: searchParams.get("maxPriceMinor") || undefined,
      durationDays: searchParams.get("durationDays") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    };

    const parsed = packageQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Parámetros de búsqueda inválidos para el catálogo",
          correlationId,
          details: parsed.error.flatten(),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { items, meta } = await packageService.listPackages(parsed.data);

    const response: ApiSuccessResponse<PackageListItem[]> = {
      data: items,
      meta,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Correlation-ID": correlationId,
      },
    });
  } catch (error) {
    // Permitir propagación de señales internas de Next.js (prerender bailout)
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_")) {
      throw error;
    }

    console.error(`[${correlationId}] Error al consultar /api/packages:`, error);
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar el catálogo turístico",
        correlationId,
      },
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
