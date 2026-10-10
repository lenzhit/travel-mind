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
| Revisión manual | Reservas `manual_review` | Investigar el evento y estado registrados. No forzar una confirmación ni repetir pagos. Resolución manual mediante UI pendiente. |
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

La fase 4 continúa con automatización E2E de navegador, retención del resto del ledger, resolución operativa de revisión manual y pruebas de carga representativas. Este panel no acredita disponibilidad de producción ni cumplimiento WCAG completo.
Cada lectura autorizada emite un log JSON local con timestamp, level, event operational_metrics_read, correlation_id, mode test/demo y duration_ms de la consulta/validación. No registra el actor, filas, cookies ni cuerpos. Esta medición individual no acredita p50/p95 ni capacidad; no se ejecutó una prueba de carga.
Verificación 2026-10-10: 56 pruebas unitarias/componentes y 30 de integración correctas; lint, typecheck y build correctos. Navegador con cuenta ficticia admin: apertura del panel desde Mi cuenta, actualización y salida mediante Enter. Vista de 320 px sin desbordamiento del documento (305 px útiles por barra de desplazamiento). Cuenta temporal eliminada. Revisión puntual de accesibilidad; no auditoría completa.
La protección de páginas espera connection() antes de consultar la sesión. Así, las fechas de vencimiento se validan al recibir la solicitud y Next.js no intenta prerenderizar esta lectura durante la precarga.
