---
name: ux-research-flows
description: >-
  Diseña recorridos de cliente y de staff de TravelMind, con estados de
  cotización, HITL, pago simulado y fallo de proveedor. Usar al definir un
  flujo, una fricción o los estados de una pantalla antes de maquetar.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Flujos de experiencia

## Propósito

Describir el camino que una persona puede completar en la demo, incluyendo los puntos donde el sistema debe parar: falta un dato, la cotización venció, el precio cambió, hace falta aprobación o el proveedor mock falló. El flujo no promete una reserva real ni un destino que el catálogo no tiene.

## Cuándo activar

- Al definir el recorrido de una pantalla nueva: home, ficha, chat, cotización, checkout, mis reservas, login, admin, cola HITL o métricas.
- Cuando la UI vaya a mostrar un estado de negocio y no esté claro qué puede hacer ahí el actor.
- Antes de implementar, si hay más de un desenlace (éxito demo, espera, rechazo, error).

## Precondiciones

- Actores de `AGENTS.md` §5. El flujo nombra uno.
- Reglas de `booking-domain-logic` y etiquetas de `ui-design-system`. No relajar el HITL para acortar el camino.
- Penpot es optativo y no hace falta para escribir el flujo. No exigir Figma de pago.

## Procedimiento

1. Escribir el flujo en pasos numerados, en español, con el estado de sistema al final de cada paso. Ejemplo de cabecera: actor, entrada, éxito demo, salidas alternativas.
2. Cliente, camino feliz de demo:
   - Busca o pregunta en el chat.
   - Ve paquetes que existen en el catálogo, con precio de ficha no vinculante.
   - Pide cotización y ve el desglose y la vigencia de 24 h.
   - Acepta esa versión.
   - Si el total supera USD 2 000, espera en `pending_approval` y no ve el botón de pago.
   - Si no, paga en simulación y ve "no se realizó ningún cargo ni reserva externa".
   - Consulta la reserva en `confirmed_demo` o en el estado de fallo real.
3. Staff:
   - `approver` abre la cola, ve importe, moneda, cliente demo, fechas y riesgo, y aprueba o rechaza con motivo. No es el mismo actor que creó la solicitud si hay segregación.
   - `travel_agent` atiende `manual_review` y no inventa un precio nuevo fuera del servicio.
   - `admin` edita catálogo. El cambio no confirma reservas ya emitidas.
4. Para cada paso, anotar vacíos y errores que la pantalla debe contemplar: sin resultados, Ollama caído (fallback de filtros), quote `expired`, `PRICE_CHANGED`, pago `failed`, proveedor caído tras el pago (`refund_pending` o `manual_review`), notificación no enviada pero reserva visible.
5. Marcar fricción deliberada que no se debe quitar: reconfirmación de precio, consentimiento, HITL, etiqueta de simulación. Marcar fricción evitable: pedir dos veces el mismo dato, loader sin fin, código de error en inglés crudo.
6. No dibujar un paso "el asistente confirma y cobra". Separar recomendación, cotización y pago en pantallas o bloques distintos.
7. Entregar el flujo en la respuesta de la tarea o en el documento que se haya pedido. No generar un deck ni un archivo de diseño si no se pidió.

## Herramientas permitidas y restricciones

- Permitido: texto, diagrama mermaid simple, componentes ya existentes como referencia (`demo-banner`, `Button`, `Card`).
- Prohibido: fotos de destinos presentadas como reales, copy que diga "reserva confirmada" sin "simulación", y atajos que salten la aprobación.
- No abrir una herramienta de diseño de pago ni crear una cuenta para "ver el flujo".

## Buenas prácticas

- Un flujo, un actor principal. El handoff a `approver` es otro carril, enlazado por el id de aprobación.
- El invitado puede explorar. El pago exige `customer`.
- Mostrar la moneda y la hora de vencimiento en el paso de aceptación, no solo en el correo de Mailpit.
- Si el precio cambia, el flujo vuelve a la aceptación. No sigue al botón de pago con el total viejo.

## Validaciones y criterios de aceptación

- [ ] Cada paso tiene un estado de sistema que existe en el dominio.
- [ ] El carril de más de USD 2 000 no contiene pago antes de `approved`.
- [ ] Hay al menos un desenlace de fallo de proveedor después del pago simulado.
- [ ] El texto de éxito dice que es simulación.
- [ ] No aparece Booking.com ni un cargo real como paso obligatorio.

## Errores frecuentes

- Un solo happy path y el error como nota al pie imposible de diseñar.
- Usar el mismo botón "Continuar" desde el chat hasta el cargo.
- Tratar USD 2 000 exactos como escalado.
- Prometer el correo como única prueba de reserva. La prueba es la pantalla de estado, aunque Mailpit falle.

## Entregables

Flujo del actor, estados por paso, desenlaces alternativos y fricciones que deben conservarse. Listo para que `ui-design-system` lo implemente sin inventar transiciones.

## Ejemplo

Cliente con cotización de USD 2 050. Paso 4: pantalla "Pendiente de aprobación", sin botón de pago, con el total y el motivo "supera USD 2 000". Carril del approver: aprobar. Solo entonces el cliente ve "Pagar simulación". Si rechaza, el cliente ve `rejected` y no un cobro a medias.
