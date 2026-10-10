---
name: postgres-data-modeling
description: >-
  Modela tablas, constraints, índices y migraciones locales de TravelMind en
  PostgreSQL con pgvector. Usar al crear el esquema, elegir ORM, escribir
  migraciones, seeds demo o consultas de cotización, reserva y RAG.
compatibility: >-
  PostgreSQL local y extensión pgvector. ORM aún no elegido: Prisma o Drizzle,
  uno solo, con migraciones en el repo. Sin base cloud.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Modelo de datos PostgreSQL

## Propósito

Persistir el dominio turístico con integridad, dinero entero y migraciones reversibles. La URL por defecto en `src/lib/env/index.ts` es `postgresql://postgres:postgres@localhost:5432/travelmind`. No hay carpeta de ORM todavía: no crear `prisma/` ni `drizzle/` hasta la tarea que elija uno.

## Cuándo activar

- Al definir tablas, enums, FKs, índices o seeds.
- Al elegir Prisma o Drizzle.
- Al guardar embeddings, cotizaciones versionadas, pagos o auditoría.

## Precondiciones

- Pasar PostgreSQL, pgvector y el ORM por la matriz si aún no están registrados como adopción concreta. PostgreSQL y pgvector ya están admitidos en `docs/cost-matrix.md`.
- No aplicar migraciones contra una base que no sea local de desarrollo o de test.
- Seeds solo con datos ficticios etiquetados como demo. Sin PII real.

## Procedimiento

1. Elegir un ORM en un ADR si todavía no hay decisión. A partir de ahí, todas las migraciones usan ese camino.
2. Modelar solo las tablas que la historia persiste. Entidades previstas cuando hagan falta: `users`, `roles`/`memberships`, `sessions`, `destinations`, `packages`, `package_variants`, `package_availability`, `queries`, `messages`, `rag_documents`, `rag_chunks`, `quotations`, `quotation_items`, `quotation_versions`, `reservations`, `reservation_travelers`, `provider_booking_attempts`, `payments`, `payment_events`, `approval_requests`, `approval_decisions`, `notification_deliveries`, `audit_logs`, `idempotency_keys`.
3. En cada tabla de negocio: `id` UUID, `created_at`, `updated_at`, `status` cuando el ciclo de vida exista. Eventos de integración llevan `correlation_id`. Referencias externas llevan `provider_reference` único por proveedor.
4. Dinero: entero de unidad menor más `currency` CHAR(3). Prohibido `float`, `double` y `numeric` improvisado para un total que luego se compara con el umbral. USD 2 000 = `200000` en centavos. El borde HITL es `total_minor > 200000` cuando `currency = 'USD'`. Otra moneda guarda `fx_rate`, `fx_as_of` y `fx_source` usados para la comparación; no hardcodear el tipo de cambio.
5. Estados permitidos, como check o enum, sin valores inventados:
   - Cotización: `draft`, `issued`, `expired`, `superseded`.
   - Reserva: `requested`, `pending_approval`, `pending_payment`, `payment_processing`, `pending_provider`, `confirmed`, más terminales `rejected`, `expired`, `failed`, `cancelled`, `manual_review`, `refund_pending`, `refunded`. En demo, la confirmación simulada se distingue (`confirmed_demo` o columna `confirmation_mode`) para no confundirla con `confirmed` de proveedor real.
   - Pago: `created`, `pending`, `succeeded`, `failed`, `cancelled`.
   - Aprobación: `pending`, `approved`, `rejected`, `expired`.
6. Constraints: FK con acción explícita, unicidad de idempotencia por (`user_id`, operación, hash de payload), unicidad de evento de pago por id de proveedor, y `issued_at` no nulo cuando `status = issued`. La expiración es `issued_at + interval '24 hours'`, calculada en el servicio y guardada en `expires_at`.
7. `rag_chunks.embedding` usa pgvector. Índice acorde al operador de distancia elegido y documentado. El chunk guarda `document_id`, versión, origen, fecha y ACL. No guardar PAN, documentos de identidad ni secretos.
8. Escribir la migración hacia adelante y el rollback. Índices para filtros reales: paquete por destino y estado, cotización por usuario y `expires_at`, reserva por usuario y estado, idempotencia por llave.
9. Seed demo identificable (títulos y correos `@example.test`). No incluir reseñas o cupos que el código trate como inventario en vivo.

## Herramientas permitidas y restricciones

- Permitido: cliente `psql` local, migraciones del ORM elegido, tests de integración contra PostgreSQL de test.
- Prohibido: SQL emitido por el LLM en runtime, `synchronize` automático contra una base compartida, y extensiones cloud de vectores de pago.
- El embedding se calcula en local. La columna no se rellena llamando a una API por token.

## Buenas prácticas

- Transacción única para emitir cotización e ítems. Otra para revalidar y pasar de estado; comparar `status` esperado en el `UPDATE` para no pisar un concurrente.
- Viajeros: mínimos necesarios. Definir retención en la misma migración que crea la columna sensible.
- No usar el vector como disponibilidad. La disponibilidad sale de `package_availability` o del `TravelProvider`.
- Nombres de tabla y columna en inglés, `snake_case`.

## Validaciones y criterios de aceptación

- [ ] La migración aplica y revierte en PostgreSQL local.
- [ ] Un total no cabe en un float. El test del umbral cubre `200000` (no escala) y `200001` (escala) en USD.
- [ ] La cotización emitida tiene `expires_at = issued_at + 24 h`.
- [ ] La llave de idempotencia impide dos reservas con el mismo payload.
- [ ] El seed no contiene PII real ni secretos.
- [ ] `rag_chunks` no se consulta para afirmar un cupo.

## Errores frecuentes

- Guardar `19.99` como `numeric` y comparar con `2000` en dólares flotantes.
- Añadir el estado `confirmed` cuando el mock solo terminó el pago.
- Crear todas las tablas del dominio en una migración gigante antes de tener repositorios.
- Activar `pgvector` en un Postgres que no es el de Compose/local y apuntar `DATABASE_URL` a un host remoto.

## Entregables

Migración versionada, rollback, constraints, índices de la historia y un test de integración de la invariante que la historia introduce. Actualizar el ADR si esta tarea elige el ORM.

## Ejemplo

Al emitir una cotización, una transacción inserta `quotations` (`status=issued`, `expires_at`) y `quotation_items` con `amount_minor` y `currency`. Un segundo submit con la misma idempotency key devuelve la misma fila y no inserta otra.
