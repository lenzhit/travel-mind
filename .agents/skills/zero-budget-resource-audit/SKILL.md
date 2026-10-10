---
name: zero-budget-resource-audit
description: >-
  Audita licencia, permanencia del plan gratuito, cuotas, requisito de tarjeta
  y sustituto local antes de incorporar una dependencia en TravelMind. Usar al
  elegir librerías, modelos, embeddings, APIs, hosting, CI, imágenes o servicios,
  y al actualizar docs/cost-matrix.md.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Auditoría de presupuesto cero

## Propósito

Decidir si un recurso puede entrar al MVP de TravelMind sin pago obligatorio. La fuente de verdad es `docs/cost-matrix.md` junto con `package.json` y `src/lib/env/index.ts`. Una fila nueva solo se agrega después de comprobar la fuente oficial, no a partir de memoria del modelo.

## Cuándo activar

- Antes de `pnpm add`, de un servicio en Compose, de un modelo Ollama o de una variable que apunte fuera de localhost.
- Cuando una tarea proponga Stripe, Booking, WhatsApp real, SMTP real, hosting o una base de datos cloud.
- Cuando cambien las condiciones de un recurso ya listado en la matriz.

No activar para corregir un bug que solo usa dependencias ya instaladas.

## Precondiciones

- Leer `docs/cost-matrix.md`, `AGENTS.md` §0 y `package.json`.
- No instalar el recurso durante la auditoría.
- No crear cuentas ni introducir tarjetas.

## Procedimiento

1. Nombrar el recurso, la necesidad que cubre y qué recurso de la matriz ya la cubre.
2. Clasificarlo:
   - **A.** Código abierto autoalojable, con licencia identificada (MIT, Apache-2.0, PostgreSQL, ISC u otra compatible).
   - **B.** Gratis permanente para uso académico, sin tarjeta y con la función crítica disponible. Documentar que gratuito no implica open source (n8n Community es el caso vigente).
   - **Rechazo.** Suscripción, prueba temporal, créditos, pago por token, facturación por consumo o función crítica bloqueada en un plan de pago.
3. Abrir la URL oficial y registrar, con fecha de verificación: licencia o tipo de plan, límites, registro, dependencia de red, riesgo de cobro y alternativa local.
4. Exigir un adaptador mock o un camino local ya usable en `APP_MODE=demo`. Las pruebas no pueden requerir la cuenta externa.
5. Si se admite, añadir una fila a `docs/cost-matrix.md` con las columnas existentes: Recurso, Función, Licencia / modalidad, Coste requerido para demo, Condiciones y Referencia. Coste de demo = `USD 0`.
6. Si se rechaza, detener la incorporación y dejar el sustituto local indicado en la matriz (mock, Mailpit, Ollama, PostgreSQL local).
7. No cambiar `src/lib/env/index.ts` para que un proveedor de pago sea el predeterminado. Los defaults vigentes son `demo`, `ollama`, `mock`, `mailpit`, `n8n-local`.

## Herramientas permitidas y restricciones

- Permitido: lectura del repo, documentación oficial, diff de `package.json` y de la matriz.
- Prohibido: `pnpm add` de un paquete no auditado, claves live, Stripe como dependencia del flujo, APIs de tokens, Booking.com, n8n Enterprise o Cloud, y cualquier fallback silencioso a un proveedor facturable.
- Ollama (MIT) no autoriza el modelo. Comprobar la licencia de la variante exacta. No asumir que `qwen2.5:3b` es Apache-2.0 porque otras variantes lo sean. Perfil previsto: `qwen2.5:1.5b` o, si el equipo lo soporta, `qwen2.5:7b`.

## Buenas prácticas

- Una necesidad, una fila. No agrupar "servicios de IA" en una sola entrada.
- Si la cuota se agota, la degradación vuelve al mock o al fallback determinista y queda visible en la UI.
- Vercel Hobby, GitHub Actions y Stripe sandbox son optativos. Ninguno sustituye el recorrido local.
- Separar coste de licencia (USD 0) del hardware ya disponible. No prometer 10 000 consultas/mes sobre un plan gratuito.

## Validaciones y criterios de aceptación

- [ ] La matriz cita URL oficial y fecha de verificación.
- [ ] Existe sustituto local y el E2E puede ejecutarse sin esa cuenta.
- [ ] `.env.example`, tests y workflows no ganan secretos.
- [ ] `GET /api/health` sigue reportando `checks.budgetPolicy = USD_0`.
- [ ] No quedó una dependencia instalada "para probar" si la decisión fue rechazo.

## Errores frecuentes

- Tratar un free trial o créditos de bienvenida como plan permanente.
- Dar por verificado un modelo por el nombre de la familia.
- Añadir el SDK y dejar el mock como código muerto.
- Registrar "open source" para n8n. La licencia vigente en la matriz es Sustainable Use License, fair-code, no OSI.
- Activar facturación automática al crear una cuenta de sandbox.

## Entregables

Decisión `admitido` o `rechazado`, evidencia (URL, fecha, límites, riesgo de cobro) y, si se admite, la fila añadida a `docs/cost-matrix.md`. Si la tarea de implementación es distinta, no instalar el recurso en el mismo paso.

## Ejemplo

Entrada: "añade el SDK de OpenAI para mejorar el chat".

Salida esperada: rechazo. La inferencia del MVP es Ollama local más fallback de catálogo sin LLM. No se añade dependencia ni se modifica `AI_PROVIDER`.
