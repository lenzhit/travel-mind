---
name: technical-documentation
description: >-
  Documenta decisiones, demo y limitaciones de TravelMind en español, sin dar
  por conectado un proveedor que no se ejecutó. Usar al actualizar README, ADR,
  matriz de coste o el manual de la demostración cuando la tarea pida docs.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Documentación técnica

## Propósito

Dejar constancia de lo que el código hace hoy, qué está simulado y cómo se reproduce en local. No crear documentos que la tarea no pidió. `AGENTS.md` y `docs/cost-matrix.md` ya existen; se actualizan cuando cambia una regla o un recurso, no para repetirlos.

## Cuándo activar

- Al cerrar una tarea que pidió README, ADR, runbook o manual de demo.
- Al cambiar un default de `src/lib/env/index.ts`, un estado de negocio o un recurso de la matriz.
- Al explicar qué hace falta para enseñar el recorrido académico.

## Precondiciones

- Leer el archivo que se va a editar y el ADR 0001 antes de añadir otro.
- Evidencia: comando corrido y resultado. Si no se corrió, escribir "no ejecutado".
- Idioma de la prosa: español. Identificadores, rutas y comandos: inglés, como en el repo.

## Procedimiento

1. Elegir un solo lugar:
   - Cambio de regla estructural → `docs/adr/NNNN-*.md`, formato del ADR 0001, número siguiente al último archivo.
   - Recurso nuevo admitido → fila en `docs/cost-matrix.md` (lo hace la skill de auditoría; no duplicar la fila en un segundo sitio).
   - Cómo arrancar la demo → `README.md`, que ya describe el proyecto. Ampliar la sección existente, no pegar otro inicio.
   - Operación puntual (restaurar Mailpit, reindexar) → `docs/runbooks/` solo si la tarea lo pide.
2. Incluir: objetivo, comando, resultado, modo `demo`, y la frase de simulación cuando el flujo reserva o cobra. Enlazar el mock usado.
3. No escribir que una API está conectada, que un pago se capturó o que una reserva externa existe si la evidencia es el mock. Decir `confirmed_demo` y "sin cargo".
4. Requisitos de hardware junto al modelo Ollama elegido, o decir que el fallback determinista no necesita modelo.
5. No documentar 10 000 consultas/mes como capacidad medida. Si hay un cálculo, van supuestos y hardware.
6. Quitar de los ejemplos cualquier secreto. Los ejemplos usan `postgres:postgres` y `@example.test`.
7. Diff corto. No reformatear documentos ajenos al cambio.

## Herramientas permitidas y restricciones

- Permitido: editar los markdown que la tarea nombró.
- Prohibido: inventar capturas de un proveedor real, tutoriales de Stripe live, y documentos nuevos "por completar el árbol" de `AGENTS.md` (`architecture.md`, `product-requirements.md`, etc.) si no existen y no se pidieron.
- No crear scripts ni makefiles para generar la doc salvo pedido explícito.

## Buenas prácticas

- Una decisión por ADR. El estado inicial es `Aceptado` solo si la tarea ya la adoptó en código; si está propuesta, decirlo.
- Fecha calendario real del cambio.
- Referencias a archivos con ruta desde la raíz (`src/lib/env/index.ts`).
- Limitaciones en una lista corta al final: qué no corre sin Docker, sin Ollama o sin el script E2E.

## Validaciones y criterios de aceptación

- [ ] Cada afirmación de "funciona" tiene comando y resultado, o está marcada como no verificada.
- [ ] El lector distingue mock de proveedor real en un párrafo, sin leer el código.
- [ ] No hay secretos ni PII.
- [ ] No apareció un markdown nuevo no solicitado.
- [ ] Los enlaces internos apuntan a archivos que existen.

## Errores frecuentes

- Copiar la sección 15 de `AGENTS.md` dentro del README y llamarlo manual.
- Documentar Prisma cuando el ORM sigue sin elegirse.
- Decir que `pnpm test:e2e` pasa cuando el script no está en `package.json`.
- Traducir nombres de estado al español en la doc y dejar de coincidir con el código (`confirmed_demo`).

## Entregables

El archivo pedido, actualizado, con evidencia y limitaciones. En la respuesta de la tarea, la ruta y qué quedó sin verificar.

## Ejemplo

Tras añadir el mock de pago, el README gana tres líneas: comando de test, que el checkout es simulado y que Stripe no interviene. No se crea `docs/architecture.md` en esa misma tarea.
