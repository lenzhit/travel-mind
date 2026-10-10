import { writeFileSync } from "node:fs";
import { z } from "zod";
import { chatInputSchema } from "../src/features/chat/schemas";
import { quoteInputSchema } from "../src/features/quotes/schemas";
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
