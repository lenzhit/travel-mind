# Checkpoint de TravelMind — 2026-10-11

Estado: desarrollo y verificación del MVP en curso. No declarar finalizado: faltan orquestación por eventos, recuperación completa tras caída, evaluación IA más amplia y revisión WCAG/accesibilidad.

## Objetivo inmediato

Ampliar la evaluación reproducible del RecommenderAgent y cerrar las brechas críticas de reserva, incidencias y notificaciones sin repetir componentes ya implementados.

## Implementado y verificado

- Seis workflows n8n (`maintenance`, `consultation`, `quotation`, `reservation`, `notifications`, `exception_handling`) importados y activos. Cada uno registró al menos una ejecución `mode=trigger,status=success`; también pasaron las ejecuciones manuales. Cuatro ejecuciones antiguas de mantenimiento quedaron históricamente en `running` antes de la corrección; no se eliminaron.
- Endpoints internos autenticados y trabajos acotados de consulta, vencimiento de cotizaciones, seguimiento de reservas, outbox y excepciones. Next.js conserva la lógica de negocio; los flujos n8n son periódicos posteriores a la acción, no una orquestación transaccional por evento.
- Migraciones no destructivas `0009_graceful_fantastic_four.sql` y `0010_ancient_blur.sql` aplicadas: metadatos mínimos de consultas sin texto/PII, retención de siete días y auditoría de reintentos supervisados de notificaciones.
- Recorrido HTTP real: Ollama local + pgvector, cotización, consentimiento, pago mock y `confirmed_demo`. Con Mailpit detenido, la reserva permaneció confirmada y el workflow programado reintentó las entregas tras reactivarlo. Cuatro correos fallidos pasaron a `sent_demo` en el segundo intento; cuatro mensajes WhatsApp mock quedaron en `sent_demo`.
- Evaluación IA ampliada a ocho casos: 8/8 relevancia o ausencia esperada, cinco llamadas Ollama y cinco recuperaciones semánticas (tres respuestas vacías por reglas deterministas); nueve recomendaciones con precio/fuente verificados, cero violaciones de presupuesto o duración; p50 5810 ms y p95 13129 ms. Detectó y corrigió recomendación incorrecta ante un destino explícito fuera del catálogo. Integración con documento RAG hostil rechazó una respuesta del modelo con tool call y comprobó que no creó reserva. La muestra sigue siendo pequeña y secuencial.
- Pruebas actuales: 63 unitarias, 41 de integración con PostgreSQL y diez recorridos Chromium (114 total), todos correctos. Lint, typecheck, build y generación OpenAPI correctos. Los E2E añadidos cubren pago cancelado, inventario agotado tras pago con reversión, entrega agotada reabierta desde UI y cambio de tarifa con aceptación nueva. Carga de catálogo previa: 100/100 HTTP correctos, concurrencia 5, p50 37,3 ms y p95 58,82 ms; no representa la capacidad general del sistema.
- Un `pnpm test:smoke` con n8n temporalmente detenido pasó con `confirmed_demo`; n8n se restauró. La consulta quedó luego `processed=true` y las ocho entregas quedaron `sent_demo` tras los ciclos programados. Otro smoke con Ollama detenido pasó con `aiMode=deterministic`; Ollama se restauró. La lectura correcta de SQLite **más WAL/SHM** mostró que el último disparo horario de cada uno de los seis workflows terminó `success` (IDs 86–91 a las 21:00–21:01 UTC, posteriores al cambio de métricas); copiar SQLite solo había dado una vista obsoleta. PostgreSQL no mostró duplicados por `(event_id, channel)` ni por evento de outbox.
- Mi cuenta → Entregas agotadas permite reabrir una notificación local tras tres intentos, solo por admin, con motivo, confirmación, idempotencia y hasta dos decisiones auditadas. Se reabre outbox; no se modifica pago ni reserva. Prueba de PostgreSQL con envío mock y prueba Chromium de teclado/320 px.
- Mi cuenta → Resumen operativo muestra cohorte de siete días: sesiones únicas consultadas (denominador) y sesiones confirmadas después en demo (numerador), sin PII ni porcentaje cuando no hay muestra. Integración PostgreSQL validó la relación. No es un KPI comercial real y faltan automatización elegible y percentiles continuos.
- Docker: PostgreSQL y Mailpit saludables; n8n y Ollama en ejecución. Next.js respondió en localhost:3000. Servicios simulados sin pagos ni reservas externas.

## Pendiente y límites

- Ampliar el conjunto de consultas y medir fallback por caída real de Ollama y carga/concurrencia. El set actual ya comprueba presupuesto, precio, duración, ambigüedad y un documento hostil en integración.
- Llevar al navegador los negativos aún cubiertos solo en integración (pago fallido, proveedor mock forzado y webhook/evento duplicado) y comprobar la recuperación de cada tipo de job n8n tras caída. Ya se verificó por horario la recuperación de consulta y notificaciones de un caso ficticio.
- Revisar métricas/alertas con denominadores reales, accesibilidad WCAG 2.2 AA y seguridad antes de declarar terminado.
- La orquestación n8n actual procesa colas de mantenimiento tras la acción; no sustituye una integración por eventos de punta a punta.

## Archivos afectados

Este bloque: `src/server/services/{recommendation.service,notification-retries}.ts`, `src/server/db/{schema.ts,migrations/0010*}`, `src/app/api/admin/notifications/`, `src/app/account/notifications/`, `src/components/features/analytics/`, `src/features/analytics/notification-schemas.ts`, `scripts/{evaluate-recommendations.ts,audit-n8n-executions.py,generate-openapi.ts}`, fixtures/pruebas, README, auditoría, runbook, OpenAPI y este checkpoint. El bloque previo está en el commit `60150a8` y afecta migración 0009 y seis exports en `workflows/n8n/`.

## Errores, bloqueos y reanudación

El primer recorrido de nueve E2E falló al agotar el límite legítimo de diez altas de cuenta/minuto; se cambió solo el fixture final y pasaron los diez en conjunto. Una copia de SQLite sin WAL pareció mostrar un `new` pendiente; con WAL/SHM, los seis últimos cron eran `success`. No hay un bloqueo de servicio conocido. Desde `/home/lenzhit/unt/proyecto-investigacion/travel-mind`: `source ~/.nvm/nvm.sh && pnpm ai:evaluate`; después `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build` según los componentes modificados. Verificar `docker compose ps`, n8n con copia de SQLite+WAL+SHM y el runbook. Próxima tarea exacta: diseñar una orquestación recuperable por eventos para consulta/cotización/reserva sin mover las reglas de Next.js; después completar E2E de fallos firmados/proveedor y WCAG. No reiniciar bases ni contenedores innecesariamente.
