---
name: code-review-refactor
description: >-
  Revisa diffs de TravelMind por invariantes de dominio, presupuesto cero,
  autorización y pruebas, y limita el refactor al comportamiento pedido.
  Usar al revisar un cambio o al reducir deuda concreta.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Revisión de código

## Propósito

Encontrar defectos en el diff antes de darlo por cerrado: dinero en flotante, estado ilegal, IDOR, simulación presentada como cargo, dependencia nueva no auditada y tests que no cubren la regla. El refactor solo entra si la tarea lo pide o si es el mínimo para corregir un hallazgo.

## Cuándo activar

- Al revisar un cambio propio o ajeno antes de commit, si la persona lo pidió.
- Al tocar pricing, reservas, pagos, auth, prompts o proveedores.
- Al proponer un refactor. Sin pedido, no reescribir módulos vecinos.

## Precondiciones

- Leer el diff completo, incluidos tests, `package.json` y workflows.
- Contratos de las skills de reserva, pago, API y presupuesto cero. No reabrir el diseño si el ADR 0001 ya lo fijó.

## Procedimiento

1. Clasificar el diff: producto, test, docs, infra. Revisar cada archivo con el riesgo de su clase.
2. Comprobar invariantes si el diff las toca:
   - Importes enteros. Umbral `> 200000` centavos USD, no `>=`.
   - Caducidad desde `issued_at` más 24 h.
   - Pago `succeeded` no implica `confirmed_demo`.
   - HITL bloquea el checkout.
   - Idempotencia en reserva y evento de pago.
   - El LLM no ejecuta SQL ni asigna `status`.
3. Buscar filtraciones: secretos, `NEXT_PUBLIC_` indebido, PII en logs, credenciales en `workflows/n8n/`.
4. Dependencias: un paquete nuevo sin fila en `docs/cost-matrix.md` es un hallazgo. Lo mismo un default que deje de ser `mock` u `ollama`.
5. Tests: ¿existe un caso que falle si se quita la regla? ¿`pnpm test` se ejecutó? No pedir E2E si el script no existe; pedir el nivel que el repo puede correr.
6. UI: si cambió una pantalla, la revisión pide la verificación en navegador o registra que no se hizo. La etiqueta de simulación no desaparece.
7. Escribir hallazgos en orden: bloqueante, importante, menor. Cada uno con archivo y corrección concreta. No rellenar con estilo que el lint ya cubre.
8. Refactor permitido: extraer la regla duplicada que el hallazgo señala, sin cambiar el comportamiento. No renombrar el dominio "de paso". No formatear archivos fuera del diff.

## Herramientas permitidas y restricciones

- Permitido: `pnpm lint`, `pnpm typecheck`, `pnpm test`, lectura del diff.
- Prohibido: reescribir la arquitectura, añadir abstracciones para un solo llamador, y aprobar con "se ve bien" si no se miró el test del umbral o del IDOR cuando el diff los afecta.
- No hacer commit salvo que la persona lo pida.

## Buenas prácticas

- Citar la línea y la regla. "Hay que validar mejor" no es un hallazgo.
- Si el código sigue el ADR 0001, no pedir Pages Router ni otro ORM.
- Un bloqueante de seguridad se corrige o se deja explícitamente abierto. No se diluye en una lista de nits.
- Respetar el estilo del archivo: alias `@/`, componentes de `src/components/ui`, español en textos de UI.

## Validaciones y criterios de aceptación

- [ ] Los bloqueantes tienen evidencia en el diff.
- [ ] No se pidió una dependencia de pago para arreglar el hallazgo.
- [ ] El refactor, si hubo, conserva los tests existentes en verde.
- [ ] Quedó dicho qué comandos se corrieron.
- [ ] No hay cambios de formato masivos ajenos al problema.

## Errores frecuentes

- Aprobar un cast a `any` en el handler de reserva.
- Pedir Stripe "para probar el webhook de verdad".
- Rechazar `confirmed_demo` por no estar en una lista genérica de estados, cuando la skill de datos lo usa para no mentir.
- Arreglar el hallazgo y, en el mismo diff, mover media aplicación de carpeta.

## Entregables

Lista priorizada de hallazgos y, si la tarea incluye el arreglo, el diff mínimo más el resultado de las pruebas corridas.

## Ejemplo

El servicio hace `if (totalUsd >= 2000) requestApproval()`. Hallazgo bloqueante: el borde debe ser `totalMinor > 200000` en USD. Corrección en esa condición y un test para 200000 y 200001. Sin otros refactors.
