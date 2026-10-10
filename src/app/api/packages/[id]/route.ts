import { NextRequest, NextResponse } from "next/server";
import { packageIdParamSchema } from "@/features/catalog/schemas";
import { packageService } from "@/server/services/package.service";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";
import type { PackageDetail } from "@/features/catalog";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = crypto.randomUUID();

  try {
    const resolvedParams = await params;
    const parsed = packageIdParamSchema.safeParse(resolvedParams);

    if (!parsed.success) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Identificador de paquete inválido",
          correlationId,
          details: parsed.error.flatten(),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const item = await packageService.getPackageDetail(parsed.data.id);

    if (!item) {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: "PACKAGE_NOT_FOUND",
          message: "El paquete turístico solicitado no existe o no está activo",
          correlationId,
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const response: ApiSuccessResponse<PackageDetail> = {
      data: item,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Correlation-ID": correlationId,
      },
    });
  } catch (error) {
    console.error(`[${correlationId}] Error al consultar /api/packages/[id]:`, error);
    const errorResponse: ApiErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar el detalle del paquete",
        correlationId,
      },
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
