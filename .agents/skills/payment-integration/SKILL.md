---
name: payment-integration
description: >-
  Implementa el pago simulado obligatorio de TravelMind y, solo si se habilita
  aparte, Stripe sandbox. Usar al crear checkout, eventos de pago, reembolsos
  simulados, webhooks o conciliación.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Pagos

## Propósito

Cobrar solo en simulación local. `MockPaymentProvider` (`isMock: true`) no mueve dinero. El evento de éxito es un hecho simulado, marcado como tal, y no confirma la reserva por sí solo. Stripe sandbox es una extensión opcional que no forma parte del recorrido demo ni de las pruebas por defecto.

## Cuándo activar

- Al implementar `POST /api/payments/checkout`, `payment_events` o la conciliación.
- Al añadir un webhook, un reverso o la pantalla de pago.
- Si alguien propone claves de Stripe, aunque diga "test".

## Precondiciones

- `PAYMENT_PROVIDER=mock` en `src/lib/env/index.ts`. No cambiar el default.
- La reserva está en `pending_payment` y, si el total exigía HITL, la aprobación está `approved` para la versión de precio aceptada.
- Skill `booking-domain-logic` para no saltar de `payment_processing` a `confirmed_demo`.

## Procedimiento

1. Crear el pago en `created` con importe y moneda copiados de la cotización revalidada, no del cuerpo libre del cliente. Guardar `Idempotency-Key`.
2. `MockPaymentProvider` pasa a `pending` y emite un evento local firmado o con sello verificable de simulación (`provider: "mock"`, `livemode: false`, `simulated: true`). El handler del evento es el único que puede poner `succeeded` o `failed`.
3. Verificar firma o sello, y deduplicar por id de evento. Un duplicado responde 200 sin segunda transición.
4. `succeeded` mueve la reserva a `pending_provider` y entonces se llama al mock turístico. Solo la referencia de ese mock permite `confirmed_demo`.
5. Si el mock turístico falla: dejar `refund_pending` o `manual_review`, crear el evento de reverso simulado y mostrar en UI que no hay reserva externa y que el reembolso también es simulado. No asegurar plazo real de devolución.
6. `failed` o `cancelled` no capturan y no confirman. El usuario ve el estado y puede reintentar con una llave nueva si la cotización sigue vigente.
7. UI: texto visible "SIMULACIÓN / NO SE REALIZÓ NINGÚN CARGO NI RESERVA EXTERNA" en el checkout y en el comprobante demo. No pedir número de tarjeta, CVV ni fecha de caducidad en ningún formulario propio.
8. Stripe sandbox, solo con tarea explícita y tras `zero-budget-resource-audit`: Checkout alojado, claves `sk_test` y secreto de webhook solo en servidor, firma verificada, `livemode === false` obligatorio. Si `livemode` viene true, rechazar el evento. Nunca claves live. Las pruebas del MVP no dependen de la red de Stripe.
9. No almacenar PAN. Los ids de evento y el estado bastan.

## Herramientas permitidas y restricciones

- Permitido: mock local, tests de Vitest, Mailpit para el comprobante simulado.
- Prohibido: cargos reales, tarjetas reales, guardar PAN/CVV, activar Stripe por defecto, y dar por pagado un retorno del navegador sin evento.
- No instalar el SDK de Stripe en la tarea del mock.

## Buenas prácticas

- El importe del evento se compara con el pago. Si no coincide, no transicionar; dejar `manual_review`.
- Conciliar: todo `succeeded` tiene reserva en `pending_provider`, `confirmed_demo`, `refund_pending` o `manual_review`. Un pago huérfano es alerta, no éxito.
- El cliente `customer` solo ve sus pagos. El estado no incluye el secreto del webhook.
- Logs con `payment_id` y `correlation_id`, sin cuerpo de tarjeta ni email completo si no hace falta para el diagnóstico.

## Validaciones y criterios de aceptación

- [ ] El test de demo pasa sin red y sin claves.
- [ ] El mismo evento aplicado dos veces deja un solo `succeeded`.
- [ ] Pago `succeeded` + proveedor fallido no produce `confirmed_demo`.
- [ ] Checkout rechazado si la aprobación está `pending` o la cotización venció.
- [ ] La UI muestra la simulación. El test o la revisión de UI lo comprueba.
- [ ] `.env.example` no contiene claves, ni siquiera `sk_test` reales de una cuenta.

## Errores frecuentes

- Confirmar en el `success_url`.
- Tratar el mock como si hubiera autorizado un cargo de tarjeta.
- Reembolsar en el mismo paso sin dejar estado, y perder la conciliación.
- Activar el webhook de Stripe en el camino de `pnpm test`.

## Entregables

`MockPaymentProvider`, transición por evento, tests de duplicado y de fallo de proveedor, y la etiqueta de simulación en la pantalla de checkout. Si Stripe no se pidió, no dejar código muerto que lo llame.

## Ejemplo

Checkout demo de USD 150.00. El evento mock `pay_evt_1` marca `succeeded`. El proveedor mock responde error. La reserva queda `refund_pending`, el segundo POST del mismo evento no crea otro reverso, y la página dice que no hubo cargo real.
