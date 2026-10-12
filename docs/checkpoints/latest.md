# Checkpoint de TravelMind — 2026-10-11 (modo demo local)

## Estado entregado

El recorrido académico de catálogo → recomendación (Ollama/pgvector o fallback determinista) → cotización de 24 horas → revalidación → consentimiento → aprobación si total > USD 2 000 → pago mock → prueba de inventario mock → `confirmed_demo` → notificación Mailpit/WhatsApp mock funciona sin cuenta externa ni cargo. Next.js conserva autorización, precios y transiciones; n8n ejecuta trabajos posteriores mediante eventos persistidos y seis disparadores de cinco minutos. No se conecta un proveedor turístico, PSP, SMTP o WhatsApp productivo. Las limitaciones y el guion están en `docs/DEMO.md` y `docs/mvp-audit-2026-10-11.md`.

Los cambios anteriores a este bloque quedaron en el commit local `3f7e6fa`. El bloque actual sigue sin push y deberá quedar en un commit local separado. Se conservaron los volúmenes y los registros de desarrollo.

## Cambios de este bloque

- Migración no destructiva `0011_white_metal_master.sql`: tabla `business_events` con eventos transaccionales de consultas, cotizaciones y eventos de reserva/notificación. Solo guarda IDs, correlación y códigos; no mensajes ni nombres. Los cinco workflows de negocio aceptan webhook local autenticado y hacen callback a Next.js. Reenvío, lease, cuatro intentos, cola `dead` y evento de excepción; un cuarto intento interrumpido se pone en revisión al vencer el lease. Recorrido con n8n detenido terminó `confirmed_demo`, dejó diez eventos pendientes y recuperó 10/10 al restaurarlo. Replay concurrente no duplicó pagos, reservas ni entregas.
- Migración no destructiva `0012_colorful_tyger_tiger.sql`: `response_duration_ms` en consultas. El panel de siete días añade tasas con numeradores/denominadores, muestras y percentiles de respuesta, confirmación y resolución, reintentos/errores y alertas. No presenta los datos de QA como KPI comercial.
- Evaluación de IA: 30 consultas secuenciales con 30/30 resultados esperados, 21 recomendaciones con fuente, cero sin fundamento y cero violaciones de presupuesto/duración; p50 5091 ms, p95 7717 ms. Seis consultas concurrentes a nivel 2: 6/6, p95 14356 ms, cero fallback/sin fuente. Son muestras de esta CPU, no objetivos productivos. El filtro de destino explícito impide que una palabra común de un fixture («reserva») sustituya «Japón» por un destino del catálogo.
- Accesibilidad automática: axe WCAG 2.2 AA en cuatro rutas públicas y seis de cuenta/personal, en escritorio y 320 px, sin violaciones detectadas ni desbordamiento. Corregidos el color de acento y el paginador inactivo, que ahora es un botón deshabilitado real. Teclado y foco básicos probados; pendiente revisión humana con lector de pantalla y zoom.
- `pnpm demo:start` levanta/configura servicios locales y modelos existentes, migra, conserva el seed, indexa y activa workflows ausentes. Se ensayó con una `.env.local` que solo tenía el token: Next.js respondió y las migraciones/seed no borraron registros. `docs/DEMO.md` describe el recorrido y los fallos controlados.

## Evidencia de validación

- `pnpm lint`, `pnpm typecheck`, `pnpm test` **64/64**, `pnpm test:integration` **45/45** con PostgreSQL de prueba, `pnpm test:e2e` **12/12** en Chromium con base aislada y Mailpit; build de producción correcto. Total de casos automatizados: **121**. E2E cubre éxito, tarifa cambiada/vencida, rechazo HITL, pago cancelado, falta de inventario tras pago, incidencias por rol y reintento supervisado.
- `pnpm test:smoke` contra la app real pasó con `aiMode=ollama` y `confirmed_demo`; `pnpm workflows:replay-check` pasó. El fallback con Ollama realmente detenido se había verificado en el bloque anterior; no se repitió en este bloque.
- PostgreSQL, Mailpit, n8n y Ollama activos; endpoints de salud de Next.js, n8n y Mailpit devolvieron HTTP 200. Los dos modelos locales están instalados. Los seis IDs de workflow figuraron activos. Copia conjunta de SQLite+WAL+SHM de n8n: **último `mode=trigger` de los seis en `success`**, IDs 184–189, 04:35–04:36 UTC del 2026-10-12 (23:35–23:36 del 2026-10-11 en Lima), después del reinicio y con Next.js activo. Durante la pausa previa de Next.js hubo disparos `error`; no se ocultan ni se presentan como éxitos.
- Carga ligera del catálogo: 100/100 HTTP correctos, concurrencia cinco, p50 28,87 ms y p95 33,01 ms en esta máquina. No mide IA, reserva ni capacidad de producción. `business_events` de desarrollo: consulta 3, cotización 3, reserva 12, notificaciones 12, todos `completed`; cero pares duplicados `(event_id, channel)` en entregas.
- `pnpm api:docs` regeneró contratos OpenAPI. Rollbacks manuales protegidos para migraciones 0011/0012; no se ejecutaron sobre datos existentes. El token interno se rotó localmente y no se registró en Git ni en exports.

## Límites y siguiente revisión

El MVP funcional **de demostración** está operativo; no equivale a estar listo para producción. El proceso de negocio crítico permanece síncrono en Next.js; n8n realiza la orquestación posterior durable y el mantenimiento horario. Si Next.js se apaga, los cron de n8n registran error hasta que vuelva; `business_events` y el outbox persisten. La auditoría humana WCAG con lector de pantalla/zoom, un piloto con datos consentidos, MFA del personal, tasas de conversión/automatización comercial reales, evaluación legal y adaptadores externos están fuera de esta evidencia. No se deben inferir pagos o reservas reales de `confirmed_demo`.

Para reanudar: `pnpm demo:start`, seguir `docs/DEMO.md`, `pnpm workflows:dispatch` si hubo corte, y consultar `docs/runbooks/operations.md` para estados `dead`, entregas agotadas y auditoría n8n. Ningún paso requiere borrar bases o volúmenes.
