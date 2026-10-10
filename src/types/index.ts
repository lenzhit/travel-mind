/**
 * Tipos fundamentales y contratos de dominio de TravelMind (Fase 0)
 * Diseñados según las especificaciones de api-contract-design y ui-design-system.
 */

export type AppMode = "demo" | "test" | "production";

export type Currency = "USD" | "PEN" | "EUR";

/**
 * Contrato de respuesta para GET /api/health
 */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  timestamp: string;
  mode: string;
  checks: {
    budgetPolicy: string;
    aiProvider: string;
    travelProvider: string;
    paymentProvider: string;
  };
}

/**
 * Metadatos de paginación para respuestas de lista
 */
export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Sobre estándar para respuestas exitosas de negocio ({ data, meta? })
 */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: ApiPaginationMeta;
}

/**
 * Detalle del sobre de error estándar de la API
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
  correlationId: string;
  details?: unknown;
}

/**
 * Sobre estándar para errores ({ error: { code, message, correlationId, details? } })
 */
export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
