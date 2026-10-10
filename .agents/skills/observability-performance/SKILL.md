---
name: observability-performance
description: >-
  Instrumenta TravelMind con logs JSON locales, correlation_id y eventos de
  dominio, separando demo de producción. Usar al añadir trazas, métricas,
  tiempos de respuesta o paneles operativos.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Observabilidad y rendimiento

## Propósito

Poder seguir una consulta hasta la reserva simulada en local, sin un SaaS de monitoreo. Los eventos salen de los servicios, no del prompt. Las cifras de latencia que se reporten son medidas en la máquina de demo, con el supuesto escrito al lado.

## Cuándo activar

- Al añadir logs, métricas, el panel admin o un timeout de IA.
- Al investigar una reserva atascada, un pago sin proveedor o una notificación fallida.
- Cuando alguien pida demostrar el objetivo de respuesta inicial menor de 60 s o el volumen de 10 000 consultas/mes.

## Precondiciones

- `GET /api/health` ya expone `mode` y `budgetPolicy`. No sustituirlo por un agente de APM de pago.
- OpenTelemetry OSS es optativo. No añadirlo hasta una tarea que lo pida y pase la auditoría de coste.
- Métricas en PostgreSQL o logs locales. Sin vendor de logs.

## Procedimiento

1. Generar `correlation_id` en el borde HTTP si no viene uno válido, y propagarlo al servicio, al log, al evento y a la llamada interna de n8n.
2. Log JSON en una línea: `timestamp`, `level`, `event`, `correlation_id`, `mode` (`demo` | `test` | `production`). Identificadores de reserva hasheados o internos, no el nombre del viajero.
3. Emitir solo eventos que el código realmente dispara. Catálogo previsto: `query_received`, `recommendations_returned`, `quote_issued`, `quote_expired`, `reservation_requested`, `approval_resolved`, `payment_verified`, `provider_confirmed`, `notification_sent`, `handoff_created`. No marcar `provider_confirmed` en un `confirmed_demo` sin un campo `simulated: true`.
4. Medir en el mismo proceso: duración de la tool, del pricing y del handler. Guardar p50/p95 solo si hay una muestra real (n y hardware). No extrapolar a 10 000 consultas/mes. Si se hace un cálculo de capacidad, publicar CPU, RAM, concurrencia y que es un supuesto, no un SLO de producción.
5. Alertas locales, cuando exista el panel: reembolsos `refund_pending`, pago `succeeded` sin reserva, eventos en cola de fallos, y el mismo error repetido. Distinguir filas `mode=demo` de un futuro `production`.
6. Degradación visible: timeout de Ollama → evento de fallback determinista, no un log silencioso y un cambio a API de pago.
7. Health permanece `no-store` y no incluye DSN, versiones de secretos ni lista de usuarios.

## Herramientas permitidas y restricciones

- Permitido: logs de stdout, tablas de métricas en PostgreSQL local, el endpoint de health.
- Prohibido: Datadog, Sentry SaaS u otro backend de pago como dependencia del MVP; logs con prompt completo, documento de identidad o PAN.
- No registrar cuerpos de webhook de Stripe si algún día se activan, más allá del id de evento y el resultado de la firma.

## Buenas prácticas

- Un evento por hecho de negocio. No uno por cada chunk RAG.
- `workflow_id` cuando el disparo vino de n8n, para cruzar con el JSON exportado.
- Errores con `code` de API (`QUOTE_EXPIRED`) para poder contarlos.
- El panel de métricas reutiliza el RBAC de `GET /api/admin/metrics`.

## Validaciones y criterios de aceptación

- [ ] Un request de prueba se puede seguir por `correlation_id` desde el log hasta la fila, si la historia ya persiste.
- [ ] El log de esa prueba no contiene PII ni secretos.
- [ ] Los eventos demo no se cuentan como KPI de producción.
- [ ] Cualquier número de latencia o capacidad indica muestra y hardware.
- [ ] Health sigue respondiendo 200 con `budgetPolicy: USD_0` en el test existente.

## Errores frecuentes

- Loguear el body de `/api/chat` "temporalmente".
- Contar `confirmed_demo` como reserva real en la tasa de conversión.
- Añadir un SDK de monitoreo que envía telemetría al arrancar.
- Prometer p95 < 60 s sin medición.

## Entregables

Puntos de log o eventos añadidos, ejemplo de una línea JSON redacted, y las mediciones con su contexto. Si no hubo carga, decir que no hay cifra de capacidad.

## Ejemplo

Línea válida: `{"event":"quote_issued","correlation_id":"…","mode":"demo","quote_id":"…","duration_ms":42}`. Inválida: la misma línea más el nombre del viajero o el texto completo del chat.
