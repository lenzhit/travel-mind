---
name: test-automation
description: >-
  Añade pruebas deterministas de TravelMind con Vitest y, cuando exista el
  script, Playwright. Usar al cubrir una historia, una regresión, un contrato
  API o el recorrido demo sin credenciales.
compatibility: >-
  Hoy el repo tiene pnpm test (Vitest) y no define pnpm test:e2e. No afirmar
  que Playwright está cableado hasta que el script exista.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Automatización de pruebas

## Propósito

Demostrar el comportamiento con pruebas locales repetibles. La referencia de estilo es `tests/api/health.test.ts`: Vitest, alias `@/*`, español en el título del caso, sin red. `pnpm test:e2e` aparece en `AGENTS.md` como comando objetivo, pero `package.json` todavía no lo define. No invocarlo ni darlo por verde hasta que la tarea lo agregue.

## Cuándo activar

- Al cerrar una historia de catálogo, cotización, reserva, pago, auth o agentes.
- Al corregir un bug: primero el caso que falla.
- Al pedir evidencia de regresión.

## Precondiciones

- Scripts reales: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Playwright y Testing Library están admitidos en la matriz como OSS. Instalar Playwright solo en la tarea de E2E, tras confirmar que no hace falta una cuenta.
- Fixtures en `tests/`, datos `@example.test`, importes en unidad menor.

## Procedimiento

1. Elegir el nivel mínimo que atrapa la regla:
   - Unitario: umbral `> 200000` centavos USD, borde exacto `200000`, vencimiento 24 h desde `issued_at`, transición ilegal, RBAC puro, schema de tool.
   - Integración: route handler con PostgreSQL de test, 403 de usuario ajeno, mock de proveedor, evento de pago duplicado.
   - E2E, cuando el script exista: búsqueda → recomendación (Ollama o fallback) → cotización → aceptación → HITL si aplica → pago mock → `confirmed_demo` visible. Sin internet y sin credenciales.
2. Nombrar el caso por la regla, no por el método: "un total de USD 2000 exactos no crea aprobación".
3. Fijar el reloj. No usar `Date.now()` del sistema para afirmar 24 h salvo que el servicio acepte un reloj inyectado.
4. Casos negativos, cuando la historia los toque: quote vencida, tarifa cambiada, doble submit, webhook duplicado, proveedor fallido tras pago, usuario ajeno, instrucción hostil en un chunk, rechazo HITL, timeout de Ollama con fallback.
5. Aserciones sobre el contrato público: HTTP, `code`, estado persistido, texto de simulación. No asertar clases CSS frágiles si el comportamiento cabe en el rol accesible.
6. Ejecutar la prueba afectada y, si el cambio es de tipos o lint, `pnpm typecheck` y `pnpm lint`. Decir el comando y el resultado. Si no se pudo correr, decir por qué y no marcarla como pasada.
7. Dejar los tests independientes del orden y sin puertos externos. Mailpit y Postgres, solo en integración, contra localhost.

## Herramientas permitidas y restricciones

- Permitido: Vitest, Testing Library, JSDOM, Postgres local, mocks.
- Prohibido: tests que llamen a OpenAI, Stripe, Booking o n8n Cloud; `test.skip` para ocultar un fallo; y sleeps como sincronización.
- No añadir `pnpm test:e2e` vacío.

## Buenas prácticas

- Un comportamiento por `it`. El arreglo del bug y el test van juntos.
- Reutilizar builders de cotización en el test para no copiar 40 campos.
- El fallback determinista se prueba con el proveedor de IA desconectado, no con un mock que igual llama a la red.
- No imprimir cuerpos con viajeros en el reporter.

## Validaciones y criterios de aceptación

- [ ] El comando ejecutado figura en `package.json`.
- [ ] La prueba nueva falla si se revierte la regla (umbral, caducidad o idempotencia).
- [ ] No requiere variables cloud ni tarjeta.
- [ ] El caso demo comprueba la etiqueta de simulación cuando hay pago o confirmación.
- [ ] No se reporta un E2E verde si `test:e2e` no existe.

## Errores frecuentes

- Probar `>= 2000` porque "es lo mismo".
- Congelar una respuesta completa del LLM. Preferir ids y citas, o el fallback determinista.
- Depender del orden de `describe` para la idempotencia.
- Dar por cubierto el IDOR con un test del dueño legítimo.

## Entregables

Pruebas añadidas, comando ejecutado y resultado literal (pasó, falló o no se corrió). Limitaciones: qué nivel falta (por ejemplo E2E aún sin script).

## Ejemplo

Para la caducidad: crear cotización con `issued_at` y reloj a `issued_at + 24h`, llamar a reservar y esperar `QUOTE_EXPIRED` sin fila nueva de reserva. Repetir a `23h59m` y esperar que la regla de tiempo aún la acepte, sujeta al resto de invariantes.
