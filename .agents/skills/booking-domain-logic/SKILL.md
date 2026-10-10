---
name: booking-domain-logic
description: >-
  Aplica invariantes de cotización, reserva, HITL e idempotencia de TravelMind.
  Usar al implementar PricingService, la máquina de estados, la revalidación
  de tarifa o el BookerAgent.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Lógica de reserva

## Propósito

Centralizar las transiciones que el modelo no puede saltarse. El precio sale del servicio de pricing y del proveedor mock. La confirmación exige prueba de ese proveedor o la regla documentada del inventario propio. En `APP_MODE=demo` la confirmación persistida es simulada (`confirmed_demo`) y no representa una reserva externa.

## Cuándo activar

- Al emitir, vencer o revalidar una cotización.
- Al crear una reserva, aplicar HITL o resolver un fallo de proveedor después del pago simulado.
- Al tocar idempotencia de `POST /api/reserve`.

## Precondiciones

- Dinero en unidad menor, según `postgres-data-modeling`.
- Estados cerrados. No añadir `completed`, `ok` o `paid` como sinónimos.
- El catálogo demo es la única fuente de cifras mientras `TRAVEL_PROVIDER=mock`.

## Procedimiento

1. Emitir cotización en transacción: `draft → issued`, guardar ítems, moneda, subtotal, impuestos, tarifas, descuentos, total y `expires_at = issued_at + 24 h`. Devolver el desglose. No afirmar que el cupo quedó tomado.
2. Al leer una cotización `issued`, si `now >= expires_at`, persistir `expired` y rechazar el uso con `QUOTE_EXPIRED`. No renovarla en silencio.
3. Antes de pagar o de crear la reserva, revalidar disponibilidad, tarifa, impuestos, condiciones y moneda contra el proveedor. Si el total cambia, guardar una versión nueva (`superseded` la anterior) y exigir aceptación nueva. Si el nuevo total cruza el umbral, vuelve a HITL aunque la anterior no lo exigiera.
4. Umbral: escalar solo si el total en USD es **mayor** que 200000 centavos. Un total de 200000 no escala. Otra moneda usa la tasa registrada (`fx_rate`, `fx_as_of`, `fx_source`) y compara el equivalente. No incrustar una tasa fija en el código.
5. Reserva con HITL: `requested → pending_approval`. No crear checkout. Al aprobar: `pending_payment`. Al rechazar o expirar la aprobación: terminal `rejected` o `expired`, sin cargo.
6. Sin HITL, o ya aprobada: `pending_payment → payment_processing` solo tras iniciar el checkout del `payment-integration`. El pago `succeeded` pasa a `pending_provider`, no a confirmado.
7. Confirmación: el mock (o el inventario propio documentado) debe devolver una referencia. Entonces el estado de demo es `confirmed_demo`. Si el proveedor falla tras el pago: `refund_pending` o `manual_review`, nunca `confirmed_demo`.
8. Idempotencia: llave ligada a usuario de sesión, operación y hash del payload. Repetir la misma petición devuelve la misma reserva. Un doble clic no abre dos pagos.
9. Cancelación y fallo comunican el estado real y la vía de seguimiento. No prometer reembolso instantáneo. En demo, el reembolso también es simulado y se etiqueta.
10. Cada transición escribe actor, `correlation_id` y motivo cuando es humana (HITL) o de compensación.

## Herramientas permitidas y restricciones

- Permitido: servicios en `src/server/services`, repositorio, `MockTravelProvider`.
- Prohibido: que el LLM actualice `status`, que el `return_url` del navegador confirme, y que RAG fije el cupo.
- Una tool del booker solo invoca estos pasos; si el servicio rechaza, el agente muestra el `code`.

## Buenas prácticas

- Comparar y actualizar con el estado esperado (`UPDATE ... WHERE status = $expected`). Si no hay fila afectada, releer y responder el estado actual.
- Guardar la aceptación del precio y el consentimiento como filas, no como texto de chat.
- La cotización anónima de `guest` no entra a reserva hasta que exista `customer` autorizado.
- Versión de cotización inmutable. La nueva aceptación apunta a la versión nueva.

## Validaciones y criterios de aceptación

- [ ] Test de caducidad: a las 24 h justas la cotización no se puede pagar.
- [ ] Test de umbral: 200000 USD no crea `approval_request`; 200001 sí, y no crea pago.
- [ ] Test de cambio de tarifa: sin aceptación nueva no hay checkout.
- [ ] Test de idempotencia: dos `POST /api/reserve` iguales → una reserva.
- [ ] Test de proveedor fallido tras pago `succeeded`: el estado no es `confirmed_demo`.
- [ ] El desglose de la respuesta coincide con las filas, no con una suma hecha en el prompt.

## Errores frecuentes

- Usar `>= 2000` dólares.
- Confirmar al recibir `payment.succeeded`.
- Calcular el vencimiento desde `created_at` de un `draft` en lugar de `issued_at`.
- Revalidar solo en la UI.
- Tratar `confirmed_demo` como intercambiable con `confirmed` en métricas.

## Entregables

Servicio con transiciones cubiertas por tests unitarios de las invariantes anteriores, y el estado devuelto por la API alineado con la fila. Incluir el caso de demo etiquetado.

## Ejemplo

Cotización emitida a las 15:00 con total USD 2001.00. A las 15:01 el cliente reserva: se crea aprobación `pending` y la respuesta 202 no incluye URL de pago. Un reintento con la misma llave devuelve esa misma aprobación.
