# Operación local y seguimiento

El resumen está en Mi cuenta → Resumen operativo (`/account/operations`), solo para `admin`. Las API y páginas verifican el rol actual en PostgreSQL; ocultar enlaces no es el control de autorización. Los aprobadores conservan acceso únicamente a su cola. No hay un acceso administrativo separado.

## Alcance de los datos

GET `/api/admin/metrics` devuelve `{ data }`, `Cache-Control: no-store` y una instantánea con hora UTC. La interfaz muestra la hora de Lima. El snapshot se obtiene en una sola sentencia SQL: totales, agrupaciones y alertas comparten la misma vista de la base. No devuelve identificadores, nombres, mensajes, credenciales ni cuerpos de notificación. Contrato Zod y OpenAPI: `src/features/analytics/schemas.ts`, `docs/openapi-phase4.json`; regenerar con `pnpm api:docs`.

Los datos son exclusivamente operaciones simuladas de la base local, incluidos recorridos QA ejecutados allí. Las pruebas de integración están en otra base (`travelmind_admin_test`). No existe producción en este entorno; el endpoint rechaza otros modos/hosts. No hay cifras de ventas reales ni tasas de conversión de consultas, automatización, p50/p95 o capacidad: faltan sus denominadores y muestras. No extrapolar estos contadores a objetivos comerciales.

Cotizaciones cuenta registros, no versiones. Solicitudes cuenta reservas únicas. Confirmaciones cuenta únicamente `confirmed_demo`. Aprobaciones pendientes cuenta las que siguen dentro de su plazo; las pendientes vencidas aparecen como incidencia aparte. Los contadores son acumulados desde el inicio del registro, no una ventana diaria. No hay importe facturado.

## Incidencias y respuesta

| Comprobación | Unidad y criterio | Acción del operador |
|---|---|---|
| Reversión pendiente | Reservas `refund_pending` | Ejecutar mantenimiento local y comprobar nuevamente. La reversión es simulada. |
| Revisión manual | Reservas `manual_review` | Investigar el evento y estado registrados. No forzar una confirmación ni repetir pagos. Ver el apartado Atención de casos por rol para notas y cierre de revisiones sin pago. |
| Pago sin resolución | Reservas únicas con pago succeeded, sin reversión, estado distinto de confirmed_demo/refund_pending/refunded y última actualización hace al menos 5 min | Investigar conciliación y prueba del proveedor; no tratar pago como confirmación. Dos pagos de una reserva cuentan una incidencia. |
| Aprobación vencida | Aprobaciones pending cuyo plazo terminó | Ejecutar mantenimiento; la expiración bloquea la operación en backend aunque la limpieza esté pendiente. |
| Entrega fallida | Entregas failed | Revisar Mailpit local y el siguiente intento. Puede existir un reintento recuperable. |
| Reintentos agotados | Subconjunto de entregas failed con al menos 3 intentos | Investigar el canal; no prometer entrega ni reabrir pago. No hay botón de reenvío en este incremento. |
| Evento demorado | Eventos de outbox pending con al menos 5 min | Ejecutar mantenimiento y revisar disponibilidad local de Mailpit. Un fallo de notificación no cambia la reserva. |

```bash
pnpm workflows:run
```

El mantenimiento procesa lotes acotados, reversiones, vencimientos, retención del nombre y notificaciones. Consultar los límites en `docs/reservations-payments.md`. No instala cron ni hace llamadas a servicios comerciales. Después pulsar Actualizar resumen; no hay polling automático ni ejecución de mantenimiento desde el panel. Si falla la consulta, la interfaz indica que conserva la última instantánea; un fallo inicial permite reintentar, sin inventar ceros.

## Validación y límites de este incremento

Sin cambios de esquema ni dependencias. Pruebas de PostgreSQL cubren conteo único ante pagos múltiples, agrupaciones consistentes, entregas agotadas, expiración, pagos recientes, prohibición para invitados/customer/approver y cookies no cacheables. Pruebas de UI cubren vacío, error, recuperación, última instantánea y respuesta inválida.

La fase 4 continúa con ampliación de E2E, retención del resto del ledger, resolución operativa de revisión manual y carga representativa de IA/reservas. Este panel no acredita disponibilidad de producción ni cumplimiento WCAG completo.
Cada lectura autorizada emite un log JSON local con timestamp, level, event operational_metrics_read, correlation_id, mode test/demo y duration_ms de la consulta/validación. No registra el actor, filas, cookies ni cuerpos. Esta medición individual no acredita p50/p95 ni capacidad; la carga posterior del catálogo está documentada en docs/testing/browser-and-load.md.
Verificación 2026-10-10: 56 pruebas unitarias/componentes y 30 de integración correctas; lint, typecheck y build correctos. Navegador con cuenta ficticia admin: apertura del panel desde Mi cuenta, actualización y salida mediante Enter. Vista de 320 px sin desbordamiento del documento (305 px útiles por barra de desplazamiento). Cuenta temporal eliminada. Revisión puntual de accesibilidad; no auditoría completa.
La protección de páginas espera connection() antes de consultar la sesión. Así, las fechas de vencimiento se validan al recibir la solicitud y Next.js no intenta prerenderizar esta lectura durante la precarga.
Automatización posterior: `pnpm test:e2e` ya ejecuta cuatro recorridos reales en Chromium; `pnpm test:load` mide lecturas acotadas del catálogo. Instrucciones, base desechable, resultados y límites en docs/testing/browser-and-load.md.


## Cola de incidencias — 2026-10-11

Mi cuenta → Incidencias de reservas (`/account/cases`, API `GET /api/admin/cases?page=1`) permite consultar hasta 20 incidencias por página, empezando por el último cambio más antiguo. `hasMore` señala páginas adicionales; `page` admite 1–200 y rechaza parámetros extra. La API comprueba admin o travel_agent y filtra por asignación, no guarda caché y no devuelve nombres, alias de clientes, tokens ni cuerpos de notificación. Muestra identificador de solicitud, paquete, precio aceptado, estado, motivo conocido, fecha de actualización e importes/estados de los intentos de pago. Los motivos desconocidos se presentan como necesidad de verificar evidencia, sin inventar una explicación.

La cola incluye revisiones manuales, reversiones pendientes y los mismos pagos sin resolución de la alerta del resumen. La atención añadida posteriormente se describe abajo. No permite reintentar un proveedor ni reenviar notificaciones; travel_agent solo puede atender incidencias asignadas. No se agregaron estados críticos ni cambios de esquema.

La limpieza de nombres, sesiones y credenciales retiradas está documentada en [Retención local](data-retention.md). El mantenimiento selecciona aprobaciones realmente vencidas; solicitudes vigentes no ocupan el primer lote impidiendo atender las vencidas. Las revisiones con pagos pendientes o verificados ya no se cierran por el vencimiento de la cotización.

Verificación 2026-10-11: 60 pruebas unitarias/componentes, 34 de integración y 4 recorridos Chromium correctos (98 total); lint, typecheck y build correctos. Pruebas nuevas cubren cola vacía/con datos, paginación, error con foco y recuperación, respuesta inválida, 401/403, permisos de admin, 320 px sin desbordamiento, vencimiento con pagos pendientes/verificados, retención exacta de 30 días, conservación de cotizaciones/sesión vigente e iteración de un lote de 105 visitantes en dos ejecuciones (100 + 5). No se afirma una auditoría WCAG completa. Las pruebas usan bases separadas y eliminan sus cuentas ficticias.

## Atención de casos por rol — 2026-10-11

La cola ahora admite `admin` y `travel_agent`: el administrador ve las incidencias globales y cada agente únicamente las asignadas a su UUID. El administrador asigna mediante el alias de una cuenta que actualmente tenga rol travel_agent. No se crean ni elevan cuentas desde este formulario. Cliente y aprobador carecen de acceso; un agente que intenta actuar sobre otro caso obtiene 404.

Acciones POST `/api/admin/cases/{id}`: `assign`, `note`, `close_unpaid`. Requiere mismo origen, sesión, JSON estricto, UUID de solicitud, Idempotency-Key UUID, motivo de 5–500 caracteres y expectedUpdatedAt de la instantánea mostrada. La transacción bloquea la reserva, comprueba permisos y versión actual, y vincula llave/actor/payload. Repetir la misma decisión devuelve su resultado; cambiar payload con la misma llave da 409. Hasta 100 decisiones por caso; se muestran las cinco últimas.

Asignación y notas no cambian el estado financiero ni su fecha: usan case_updated_at, por lo que la alerta de pago sin resolver conserva su antigüedad. El cierre exige status manual_review, reason price_changed y ausencia de intentos created/pending/succeeded. Cualquier pago verificado impide esta acción incluso si aparece revertido. El formulario exige marcar confirmación de cierre; servidor cancela la solicitud y vence aprobaciones pendientes en una transacción, registra actor y motivo, y genera el evento/outbox habitual. No cancela una reserva de proveedor ni dispara reembolso; tampoco altera pagos o inventario. El cliente conserva el acceso al estado cancelado.

Migraciones 0005 y 0006 agregan assignee, fecha de atención y case_actions. Las acciones conservan actor, destinatario de asignación, motivo, estado resultante, correlation_id y fecha, sin tokens en UI/logs. Notas son texto escapado de staff; no escribir PII, documentos ni datos bancarios. Por ahora permanecen con el ledger, sin borrado automático. Rollback conjunto en docs/rollbacks/0005-case-actions.sql: exige tabla de decisiones vacía y copia local previa para gestionar el historial Drizzle.

Pendiente: resolver discrepancias de pago o proveedor, reintentar proveedor y reenviar notificaciones. Ningún botón fuerza confirmed_demo ni decide el resultado del pago. Un agente cuyo rol se revoca pierde acceso en el siguiente request; el caso conserva la asignación para su auditoría y el administrador puede reasignarlo.

Verificación de atención: 61 unitarias/componentes + 35 integración + 4 E2E = 100 pruebas correctas. Lint, typecheck/build correctos. Chromium recorre asignación desde admin, acceso desde la misma cuenta de agente con filtro de objetos, nota y cierre explícito sin pago. PostgreSQL prueba IDOR, roles, decisiones concurrentes, replay/conflicto de idempotencia, estado desactualizado, cierre prohibido con pago pendiente o verificado y conservación de la alerta financiera tras una nota. Corregida asociación explícita de etiquetas de formulario. Sin afirmación de cumplimiento WCAG completo.

`pnpm exec tsx scripts/check-case-rollback.ts` aplicó todas las migraciones y su rollback conjunto en travelmind_cases_rollback_check, creada exclusivamente para esta prueba y eliminada al terminar. Si ya existe una base con ese nombre, el script se niega a reutilizarla. No modificó datos principales ni verificó rollback con decisiones reales almacenadas.

## Conciliación de importe no verificado — 2026-10-11

El formulario de incidencias ofrece **Cancelar intento no verificado** únicamente en revisión por `payment_amount_mismatch` sin pago `succeeded`. El servidor vuelve a comprobar el estado bajo bloqueo: si existe pago verificado, prueba de proveedor o referencia externa, devuelve 409. Con confirmación y motivo de personal autorizado, cancela intentos simulados `created`/`pending`, registra el evento `staff_voided_unverified`, vence aprobaciones pendientes y deja la solicitud `cancelled`. La acción es idempotente y el cliente puede consultar el resultado. No realiza reembolso, no reintenta el proveedor y nunca confirma una reserva.

Migración `0007_dizzy_zzzax.sql`: amplía solo el CHECK `case_action_type`; no elimina filas. Para revertir el esquema, primero se deben tratar las decisiones `cancel_unverified` existentes y restaurar el CHECK anterior en una migración supervisada; no ejecutar el rollback antiguo sobre datos de producción.

Si un pago mock tiene evento `succeeded`, la solicitud lleva más de cinco minutos en `pending_provider` y no existe referencia ni confirmación del proveedor, el personal autorizado puede elegir **Solicitar reversión simulada**. El servidor bloquea solicitud/pagos, exige ausencia de otros intentos abiertos, comprueba cada evento de éxito y rechaza cualquier prueba de reserva. Deja todos los pagos verificados en `refundStatus=pending`, registra `refund_requested` por pago, motivo, actor e idempotencia; el mantenimiento valida y aplica la reversión simulada de **todos** los pagos verificados antes de marcar `refunded`. Si falta un evento, conserva `refund_pending` y cuenta `refundsNeedsReview` sin bloquear los demás trabajos del lote. No ejecuta una devolución bancaria. La migración `0008_organic_metal_master.sql` amplía el mismo CHECK para esta decisión. No revierte datos existentes; para retirar la acción, revisar primero sus decisiones persistidas.

## n8n y Ollama locales — 2026-10-11

Para una instalación nueva, aplicar `pnpm db:migrate`, `pnpm db:seed`, `pnpm workflows:setup`, luego `docker compose up -d postgres mailpit n8n` y `docker compose --profile ai up -d ollama`. El generador sincroniza un token de servicio en `.env.local` y `.env.n8n.local`, ambos ignorados por Git; nunca imprimirlo ni introducirlo en exports. Instalar modelos manualmente con `docker exec travelmind-ollama ollama pull qwen2.5:1.5b-instruct-q4_1` y `docker exec travelmind-ollama ollama pull nomic-embed-text:v1.5`; después `pnpm rag:index --embed`. Si no hay modelos o conexión, el buscador determinista sigue disponible. Iniciar la app en `127.0.0.1:3000` para conservar acceso local.

`docker exec travelmind-n8n n8n import:workflow --input=/workflows/wf_maintenance.json` instala el export sin secretos e inactivo. Se verificó una ejecución real deteniendo temporalmente n8n, ejecutando `docker compose run --rm --no-deps n8n execute --id=travelmind-maintenance` y reanudando `docker compose start n8n`; la llamada interna autenticada devolvió HTTP 200. Con autorización explícita del usuario, la instancia local se activó cada cinco minutos con `docker exec travelmind-n8n n8n publish:workflow --id=travelmind-maintenance` seguido de `docker compose restart n8n`. `docker exec travelmind-n8n n8n list:workflow --active=true --onlyId` devolvió `travelmind-maintenance` y el arranque registró un workflow publicado. En una instalación nueva, publicar solo tras decidir operar de forma continua: el flujo también aplica retención, cambios de estado, reversiones mock y notificaciones. `pnpm workflows:run` permite el mantenimiento manual. El editor n8n se limita a loopback y no es una sección de administración para clientes.

La instancia n8n local permite la expresión de entorno del token para el único endpoint de mantenimiento. Esta excepción de seguridad requiere proteger el editor y no importar workflows ajenos; no se habilita para una instancia compartida o productiva. Los cinco flujos de negocio del plan original todavía requieren separación por evento, contratos, pruebas de retry y atención de errores. La prueba manual del workflow no sustituye esas verificaciones.
