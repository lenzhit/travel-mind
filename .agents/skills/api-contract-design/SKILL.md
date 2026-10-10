---
name: api-contract-design
description: >-
  Define contratos HTTP y de tools de TravelMind con DTO, códigos, idempotencia
  y el sobre de error común. Usar al crear o cambiar /api/*, webhooks internos,
  tools de agentes o esquemas de entrada y salida.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Contratos de API

## Propósito

Hacer que cada endpoint nuevo sea comprobable y no filtre datos de otro usuario. El diagnóstico `GET /api/health` ya existe y responde su propio DTO (`status`, `service`, `version`, `timestamp`, `mode`, `checks`). Los endpoints de negocio que se añadan usan el sobre común. Zod es el validador previsto y todavía no está instalado: proponerlo con `zero-budget-resource-audit` en la tarea que introduzca el primer contrato, no instalarlo de paso.

## Cuándo activar

- Al añadir o cambiar una ruta de `src/app/api/`.
- Al definir una tool de `RecommenderAgent` o `BookerAgent`.
- Al documentar un payload de n8n hacia Next.js.

## Precondiciones

- Leer `src/app/api/health/route.ts` y `src/types/index.ts` para no inventar un segundo estilo de health.
- Autorización en el servidor, por objeto. El rol de la UI no basta.

## Procedimiento

1. Partir del mapa vigente. No inventar rutas paralelas:

   | Método | Ruta | Éxito |
   |---|---|---|
   | GET | `/api/packages` | 200, página |
   | GET | `/api/packages/:id` | 200 o 404 |
   | POST | `/api/chat` | 200, recomendación con fuentes o pregunta |
   | POST | `/api/quote` | 201, cotización emitida |
   | GET | `/api/quotes/:id` | 200 solo si el actor puede verla |
   | POST | `/api/reserve` | 202 si queda asíncrona; cuerpo con recurso y estado, no "reservado" |
   | GET | `/api/reservations/:id` | 200 con estado real |
   | POST | `/api/payments/checkout` | 201, checkout demo |
   | POST | `/api/webhooks/stripe` | solo si el sandbox optativo está habilitado; firma e idempotencia |
   | POST | `/api/internal/workflows/*` | 401 sin credencial de servicio |
   | GET/PATCH | `/api/admin/approvals/:id` | según rol `approver` o `admin` |
   | GET | `/api/admin/metrics` | solo roles internos |

2. Éxito de negocio: `{ data, meta? }`. `meta` lleva `page`, `pageSize` y `total` cuando hay lista. Error: `{ error: { code, message, correlationId, details? } }` con HTTP correcto (400 validación, 401, 403, 404, 409 conflicto o idempotencia en curso, 422 regla de negocio, 429, 503 dependencia local caída).
3. `message` en español, sin pila ni SQL. `code` estable en inglés (`QUOTE_EXPIRED`, `APPROVAL_REQUIRED`, `PRICE_CHANGED`).
4. `POST /api/reserve` y el checkout exigen `Idempotency-Key`. La misma llave y el mismo payload devuelven el mismo recurso. La misma llave y otro payload → 409.
5. Definir el esquema de entrada y de salida en tipos estrictos. Cuando Zod esté en el repo, el schema es el contrato y el tipo se infiere. Hasta entonces, no simular validación con un cast.
6. Tools del recomendador, solo lectura: `search_packages`, `retrieve_approved_docs`, `get_package_details`, `check_live_availability`. Tools del booker: `get_quote`, `revalidate_quote`, `request_approval`, `create_reservation_request`, `create_checkout_session`, `get_booking_status`. Cada tool valida argumentos y pasa por el servicio; no ejecuta SQL.
7. Documentar el contrato en la tarea. Actualizar `docs/api-contracts.md` solo si esa documentación ya existe o la tarea pide crearla.
8. Añadir un test del contrato: estado HTTP, sobre, y el caso 403 de un `customer` sobre el id de otro.

## Herramientas permitidas y restricciones

- Permitido: route handlers, Vitest, esquemas locales.
- Prohibido: devolver PAN, CVV, secretos, prompts o filas crudas de viajeros. Prohibido aceptar un `status: "confirmed"` desde el cliente o desde el modelo.
- El webhook de Stripe no se registra ni se prueba contra la red de Stripe salvo una tarea que active el sandbox. El pago de la demo se prueba con el evento del mock.

## Buenas prácticas

- `correlationId` en cada error, generado en el handler si el cliente no envió uno válido.
- Paginación con límite máximo. Orden estable.
- `POST /api/chat` puede decir incertidumbre. No rellena paquetes inexistentes para cumplir el JSON.
- Endpoints internos rechazan el origen del navegador público. Credencial de `system`, distinta de un admin humano.
- Cache-Control `no-store` en cotizaciones, reservas y health.

## Validaciones y criterios de aceptación

- [ ] El HTTP coincide con el estado de negocio. Reservar no responde 200 con `confirmed` inmediato.
- [ ] El cuerpo de error tiene `code`, `message` y `correlationId`.
- [ ] Hay test de autorización por objeto y de idempotencia cuando la operación crea reserva o pago.
- [ ] La tool no acepta campos fuera del schema.
- [ ] Health sigue igual: no envolverlo en `{ data }` salvo una tarea que migre también `tests/api/health.test.ts`.

## Errores frecuentes

- 200 con `{ error: ... }` dentro.
- Confiar en el `userId` del cuerpo en lugar de la sesión.
- Usar 500 para una cotización vencida.
- Documentar OpenAPI a mano y dejar el handler con otra forma. Si hay schema, el handler lo usa.

## Entregables

Contrato (método, ruta, entrada, salida, errores, idempotencia), implementación del handler si la tarea lo pide, y tests del sobre y del 403/409 que apliquen.

## Ejemplo

`POST /api/reserve` sin `Idempotency-Key` → 400 `IDEMPOTENCY_KEY_REQUIRED`. Con cotización vencida → 422 `QUOTE_EXPIRED`. Con total que exige HITL → 202 y `data.status = "pending_approval"`, sin sesión de pago.
