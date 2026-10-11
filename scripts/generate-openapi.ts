import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { caseActionSchema, operationCasesSchema } from "../src/features/analytics/case-schemas";
import { operationalMetricsSchema } from "../src/features/analytics/schemas";
import { chatInputSchema } from "../src/features/chat/schemas";
import { quoteInputSchema } from "../src/features/quotes/schemas";
import { customerAuthSchema } from "../src/features/customer/schemas";
import { acceptanceSchema, reserveSchema, checkoutSchema, mockPaymentSchema, decisionSchema } from "../src/features/reservations/schemas";
const money = z.number().int().nonnegative();
const source = z.object({ id: z.string().uuid(), title: z.string(), uri: z.string(), version: z.number().int().positive(), approvedAt: z.string(), excerpt: z.string() });
const recommendation = z.object({ id: z.string().uuid(), title: z.string(), slug: z.string(), destination: z.string(), durationDays: z.number().int().positive(), priceMinor: money, currency: z.literal("USD"), reason: z.string(), sources: z.array(source) });
const chat = z.object({ message: z.string(), recommendations: z.array(recommendation), questions: z.array(z.string()), mode: z.enum(["ollama", "deterministic"]), retrieval: z.enum(["semantic", "catalog"]), preferences: z.object({ travelers: z.number().int().optional(), budgetMinor: money.optional(), departureDate: z.string().optional(), destinationId: z.string().uuid().optional() }) });
const quote = z.object({ id: z.string().uuid(), status: z.enum(["issued", "expired", "superseded"]), issuedAt: z.string(), expiresAt: z.string(), version: z.number().int().positive(), packageId: z.string().uuid(), packageTitle: z.string(), packageUpdatedAt: z.string(), variantId: z.string().uuid().nullable(), variantName: z.string().nullable(), departureDate: z.string(), travelers: z.number().int(), unitPriceMinor: money, subtotalMinor: money, taxesMinor: money, feesMinor: money, discountMinor: money, totalMinor: money, currency: z.literal("USD"), source: z.string(), pricingPolicy: z.string(), availability: z.literal("requires_reconfirmation"), requiresApproval: z.boolean(), inclusions: z.array(z.string()), exclusions: z.array(z.string()) });
const jsonSchema = (schema: z.ZodType) => { const { $schema: _dialect, ...value } = z.toJSONSchema(schema); void _dialect; return value; };
const content = (schema: unknown) => ({ "application/json": { schema } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const response = (name: string) => ({ description: "Resultado autorizado; Cache-Control: no-store", content: content({ type: "object", required: ["data"], properties: { data: ref(name) } }) });
const errors = Object.fromEntries([400, 401, 403, 404, 409, 422, 429, 503].map(status => [status, { description: "Contrato inválido, sesión, autorización, conflicto, límite o servicio no disponible; consultar error.code", content: content(ref("Error")) }]));
const origin = { name: "Origin", in: "header", required: true, schema: { type: "string" }, description: "Debe coincidir con el origen de la URL de solicitud" };
const post = (operationId: string, output: string, input?: string, extra: unknown[] = [], status = "200") => ({ operationId, security: [{ VisitorCookie: [] }], parameters: [origin, ...extra], ...(input ? { requestBody: { required: true, content: content(ref(input)) } } : {}), responses: { [status]: response(output), ...errors } });
const spec = { openapi: "3.1.0", info: { title: "TravelMind: recomendaciones y cotizaciones", version: "0.2.0", description: "Entorno local. No inicia reservas ni pagos. Dinero en centavos USD; fechas YYYY-MM-DD." }, servers: [{ url: "http://localhost:3000" }], paths: {
  "/api/visitor/session": { post: { ...post("prepareVisitor", "Session"), security: [] } },
  "/api/chat": { post: post("recommendPackages", "ChatResult", "ChatInput") },
  "/api/quote": { post: post("issueQuotation", "Quotation", "QuoteInput", [{ name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", format: "uuid" } }], "201") },
  "/api/quotes/{id}": { get: { operationId: "readOwnQuotation", security: [{ VisitorCookie: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": response("Quotation"), ...errors } } },
}, components: { securitySchemes: { VisitorCookie: { type: "apiKey", in: "cookie", name: "travelmind_visitor", description: "Cookie HttpOnly creada por POST /api/visitor/session; 48 horas" } }, schemas: { ChatInput: jsonSchema(chatInputSchema), QuoteInput: jsonSchema(quoteInputSchema), ChatResult: jsonSchema(chat), Quotation: jsonSchema(quote), Session: jsonSchema(z.object({ ready: z.literal(true) })), Error: jsonSchema(z.object({ error: z.object({ code: z.string(), message: z.string(), correlationId: z.string().uuid() }) })) } } };
writeFileSync("docs/openapi-phase2.json", `${JSON.stringify(spec, null, 2)}\n`);
console.log("Contrato OpenAPI local actualizado.");
const uuid = z.string().uuid();
const payment = z.object({ id: uuid, status: z.string(), totalMinor: money, currency: z.literal("USD"), refundStatus: z.string() });
const reservation = quote.omit({ issuedAt: true, status: true }).extend({ quotationId: uuid, status: z.string(), reason: z.string().nullable(), travelerName: z.string().nullable(), currentVersion: z.number().int(), providerReference: z.string().nullable(), approval: z.object({ id: uuid, status: z.string(), expiresAt: z.string() }).nullable(), payments: z.array(payment), timeline: z.array(z.object({ id: uuid, event: z.string(), createdAt: z.string() })), notifications: z.array(z.object({ id: uuid, channel: z.string(), status: z.string(), body: z.string() })), simulated: z.literal(true), policy: z.string() });
const pathId = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const idem = { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", format: "uuid" } };
const customerPost = (operationId: string, output: string, input?: string, extra: unknown[] = [], status = "200") => ({ ...post(operationId, output, input, extra, status), security: [{ CustomerCookie: [], VisitorCookie: [] }] });
const customerGet = (output: string, params: unknown[] = []) => ({ security: [{ CustomerCookie: [], VisitorCookie: [] }], parameters: params, responses: { "200": response(output), ...errors } });
const phase3 = { openapi: "3.1.0", info: { title: "TravelMind: reservas y pagos locales", version: "0.3.0", description: "Solo simulación local. Dinero en centavos USD. Cookie de cliente y visitante; aprobación admin para total >200000. No admite PAN ni CVV." }, servers: spec.servers, paths: {
  "/api/customer/session": { post: post("authenticateCustomer", "Customer", "CustomerAuth"), get: customerGet("CustomerSession"), delete: { ...customerPost("signOut", "SignedOut"), security: [] } },
  "/api/quotes/{id}/revalidate": { post: customerPost("revalidateQuote", "Review", undefined, [pathId]) },
  "/api/reserve": { post: customerPost("requestReservation", "Reservation", "Reserve", [idem], "202") },
  "/api/reservations": { get: customerGet("ReservationList") },
  "/api/reservations/{id}": { get: customerGet("Reservation", [pathId]) },
  "/api/reservations/{id}/accept": { post: customerPost("renewAcceptance", "Reservation", "Acceptance", [pathId]) },
  "/api/payments/checkout": { post: customerPost("createMockCheckout", "Checkout", "CheckoutInput", [idem], "201") },
  "/api/payments/mock": { post: customerPost("authorizeMockPayment", "Reservation", "MockPayment") },
  "/api/admin/approvals": { get: { ...customerGet("Approvals"), security: [{ CustomerCookie: [] }] } },
  "/api/admin/approvals/{id}": { get: { ...customerGet("Approval", [pathId]), security: [{ CustomerCookie: [] }] }, patch: { ...post("decideApproval", "DecisionResult", "Decision", [pathId]), security: [{ CustomerCookie: [] }] } },
  "/api/internal/workflows/process": { post: { security: [{ SystemToken: [] }], responses: { "200": response("WorkflowResult"), ...errors } } },
}, components: { securitySchemes: { ...spec.components.securitySchemes, CustomerCookie: { type: "apiKey", in: "cookie", name: "travelmind_customer" }, SystemToken: { type: "http", scheme: "bearer" } }, schemas: { ...spec.components.schemas,
  CustomerAuth: jsonSchema(customerAuthSchema), Customer: jsonSchema(z.object({ id: uuid, username: z.string(), role: z.enum(["customer", "travel_agent", "approver", "admin"]) })), CustomerSession: jsonSchema(z.object({ username: z.string(), role: z.enum(["customer", "travel_agent", "approver", "admin"]) })), SignedOut: jsonSchema(z.object({ signedOut: z.literal(true) })), Reserve: jsonSchema(reserveSchema), Acceptance: jsonSchema(acceptanceSchema), CheckoutInput: jsonSchema(checkoutSchema), MockPayment: jsonSchema(mockPaymentSchema), Decision: jsonSchema(decisionSchema), Reservation: jsonSchema(reservation), ReservationList: jsonSchema(z.array(z.object({ id: uuid, status: z.string(), createdAt: z.string(), quotationId: uuid }))), Checkout: jsonSchema(payment.omit({ refundStatus: true }).extend({ simulated: z.literal(true) })), Review: jsonSchema(quote.omit({ id: true, status: true, issuedAt: true, expiresAt: true }).extend({ quotationId: uuid, available: z.boolean(), mode: z.literal("demo"), policy: z.string(), policyVersion: z.string() })), Approval: jsonSchema(z.object({ id: uuid, reservationId: uuid, status: z.string(), version: z.number().int(), expiresAt: z.string(), travelerName: z.string().nullable(), snapshot: quote.omit({ id: true, status: true, issuedAt: true, expiresAt: true, version: true }) })), Approvals: { type: "array", items: ref("Approval") }, DecisionResult: jsonSchema(z.object({ reservationId: uuid })), WorkflowResult: jsonSchema(z.object({ checked: z.number().int(), completed: z.number().int(), refundsReconciled: z.number().int(), refundsNeedsReview: z.number().int(), retention: z.object({ expiredAccountSessions: z.number().int(), expiredLegacySessions: z.number().int(), expiredConsultations: z.number().int(), expiredVisitors: z.number().int(), anonymizedTravelers: z.number().int() }) })),
} } };
writeFileSync("docs/openapi-phase3.json", `${JSON.stringify(phase3, null, 2)}\n`);


writeFileSync("docs/openapi-phase4.json", `${JSON.stringify({ ...phase3, info: { ...phase3.info, title: "TravelMind: operación local", version: "0.4.0" }, paths: { ...phase3.paths, "/api/admin/cases/{id}": { post: { ...post("actOnCase", "CaseActionResult", "CaseAction", [pathId, idem]), description: "Admin asigna a travel_agent; admin y agente asignado anotan, cierran revisiones sin pago, cancelan importes nunca verificados o solicitan reversión simulada de pagos verificados sin prueba de proveedor. Bloqueo, evidencia, estado esperado e idempotencia. Nunca confirma ni cobra.", security: [{ CustomerCookie: [] }] } }, "/api/admin/cases": { get: { operationId: "readOperationCases", description: "Admin consulta todos; travel_agent solo casos asignados. Incluye notas autorizadas sin credenciales de sesión.", security: [{ CustomerCookie: [] }], parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 1 } }], responses: { "200": response("OperationCases"), ...errors } } }, "/api/admin/metrics": { get: { operationId: "readOperationalMetrics", description: "Solo admin. Instantánea acumulada de simulaciones locales, incluidos recorridos QA. No son KPIs de producción.", security: [{ CustomerCookie: [] }], responses: { "200": response("OperationalMetrics"), ...errors } } } }, components: { ...phase3.components, schemas: { ...phase3.components.schemas, CaseAction: jsonSchema(caseActionSchema), CaseActionResult: jsonSchema(z.object({ id: uuid, status: z.string() })), OperationCases: jsonSchema(operationCasesSchema), OperationalMetrics: jsonSchema(operationalMetricsSchema) } } }, null, 2)}\n`);
const phase4 = JSON.parse(readFileSync("docs/openapi-phase4.json", "utf8"));
phase4.paths["/api/internal/workflows/jobs/{kind}"] = { post: {
  operationId: "processLocalWorkflowJob",
  description: "Tarea acotada de n8n Community local. Next.js conserva validación, permisos, estado y persistencia. No recibe datos de cliente en el cuerpo.",
  security: [{ SystemToken: [] }],
  parameters: [{ name: "kind", in: "path", required: true, schema: { type: "string", enum: ["consultation", "quotation", "reservation", "notifications", "exception"] } }],
  responses: { "200": response("WorkflowJobResult"), ...errors },
} };
phase4.components.schemas.WorkflowJobResult = jsonSchema(z.union([
  z.object({ processed: z.number().int(), withRecommendations: z.number().int(), withOllama: z.number().int() }),
  z.object({ expired: z.number().int() }),
  z.object({ approvalsChecked: z.number().int(), refundsReconciled: z.number().int(), refundsNeedsReview: z.number().int() }),
  z.object({ checked: z.number().int(), completed: z.number().int() }),
  z.object({ alerts: operationalMetricsSchema.shape.alerts, retention: z.object({ expiredAccountSessions: z.number().int(), expiredLegacySessions: z.number().int(), expiredConsultations: z.number().int(), expiredVisitors: z.number().int(), anonymizedTravelers: z.number().int() }) }),
]));
writeFileSync("docs/openapi-phase4.json", JSON.stringify(phase4, null, 2) + "\n");
