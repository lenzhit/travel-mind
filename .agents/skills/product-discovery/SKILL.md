---
name: product-discovery
description: >-
  Delimita historias, reglas y alcance del MVP de TravelMind con criterios
  Given/When/Then. Usar al escribir requisitos, cortar una historia, priorizar
  el backlog o decidir si una función entra en las fases 0 a 4.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Descubrimiento de producto

## Propósito

Convertir una petición en una historia comprobable, ligada al proceso consulta → recomendación → cotización → reserva → pago → confirmación → notificación. El resultado dice qué se demuestra en local, qué queda fuera del MVP y qué regla de negocio no puede quedar implícita.

## Cuándo activar

- Al abrir una historia de catálogo, chat, cotización, reserva, aprobación, pago simulado o panel admin.
- Cuando una petición mezcle demo académica con producción comercial o con un proveedor real.
- Antes de implementar si el alcance, el actor o el criterio de aceptación están ambiguos.

## Precondiciones

- Leer `AGENTS.md` §1, §5, §6 y §7, y `docs/adr/0001-fase-0-fundamentos-y-stack.md`.
- No inventar precios, cupos, reseñas, tasas ni políticas comerciales. Si el dato no existe en seeds o en un proveedor validado, la historia debe decir "dato pendiente de catálogo demo".
- Fase 5 (producción con gasto) queda fuera de esta skill.

## Procedimiento

1. Nombrar el actor: `guest`, `customer`, `travel_agent`, `approver`, `admin` o `system`. Un actor no hereda permisos de otro.
2. Ubicar la historia en una fase:
   - 0 fundamentos y health demo.
   - 1 catálogo y admin de paquetes.
   - 2 chat, RAG, cotización 24 h.
   - 3 reserva, HITL, pago mock, Mailpit.
   - 4 métricas, accesibilidad y casos negativos.
3. Escribir la historia en español, con identificadores de código en inglés:

   ```text
   Historia: <id corto>
   Actor: <rol>
   Fase: <0-4>
   Quiero: <resultado observable>
   Para: <objetivo del proceso turístico>

   Dado <estado de datos demo y sesión>
   Cuando <acción>
   Entonces <resultado verificable>
   Y <regla que no puede romperse>
   ```

4. Declarar reglas que apliquen, solo si la historia las toca:
   - Cotización `issued` vence a las 24 h de `issued_at`.
   - Antes de pagar se revalidan tarifa, impuestos, moneda y disponibilidad.
   - HITL si el total es **mayor** que USD 2 000 (o equivalente con tasa, fecha y fuente registradas). USD 2 000 exactos no escalan.
   - En demo el estado de cierre es `confirmed_demo` y la UI dice que no hubo cargo ni reserva externa.
   - El LLM no crea paquetes, precios ni el estado `confirmed`.
5. Marcar explícitamente fuera de alcance: multitenant, GDS, cancelaciones automáticas, WhatsApp productivo, app nativa, antifraude avanzado y Booking.com.
6. Añadir casos negativos que la historia debe sobrevivir: quote vencida, tarifa cambiada, reintento, usuario ajeno, rechazo HITL, proveedor fallido después del pago simulado.
7. Entregar criterios de aceptación comprobables en local, sin cuenta externa. No escribir código de producto en esta skill salvo que la tarea pida implementar.

## Herramientas permitidas y restricciones

- Permitido: lectura de `AGENTS.md`, ADR 0001, tipos en `src/types/` y `src/features/*/index.ts`.
- Prohibido: fijar un precio de demostración que no salga de un seed, prometer disponibilidad desde documentos RAG, y dar por confirmada una reserva.

## Buenas prácticas

- Una historia, un resultado observable. Partir "reservar y pagar y notificar" si cada paso tiene reglas distintas.
- El invitado puede ver catálogo. La cotización anónima exige sesión acotada y límite de abuso; no es un checkout.
- El cliente solo ve sus cotizaciones y reservas. Escribir el criterio de objeto (evitar IDOR) en el Entonces, no como nota de UI.
- Separar recomendación (evidencia de catálogo) de cotización (precio del servicio de pricing).

## Validaciones y criterios de aceptación

- [ ] Actor, fase e historia caben en el MVP de presupuesto cero.
- [ ] Cada Entonces se puede probar con Vitest o con un recorrido local.
- [ ] Las cifras comerciales quedan como "provenientes del catálogo demo", no como literales inventados.
- [ ] Si hay pago o reserva, el criterio exige la etiqueta de simulación.
- [ ] Lo descartado está listado, no mezclado en el alcance.

## Errores frecuentes

- Aceptar "el asistente confirma la reserva" como criterio. Quien confirma es la máquina de estados con prueba del mock o del inventario propio.
- Usar `>= 2000` en el HITL.
- Meter Stripe o correo real como paso obligatorio de la demo.
- Escribir criterios que solo se cumplen con internet después de instalar dependencias.

## Entregables

Historia con Given/When/Then, fase, exclusiones y casos negativos. Guardarla donde la tarea lo pida (issue, `docs/product-requirements.md` o el mensaje de la tarea). No crear ese documento si la tarea no pidió un archivo.

## Ejemplo

Entrada: "el chat debe cerrar paquetes de más de 2000 dólares solo".

Salida: historia de Fase 3, actor `customer`. Dado una cotización emitida cuyo total supera USD 2 000, cuando solicita reservar, entonces se crea `approval_request` en `pending` y no se inicia el pago. Y un total de USD 2 000 exactos no entra a HITL. Fuera de alcance: cobro real.
