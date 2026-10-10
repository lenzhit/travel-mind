# Reservas, aprobaciones y pagos locales

El recorrido es catálogo/asistente → cotización → cuenta → revalidación → aceptación → solicitud → aprobación si corresponde → autorización de pago de prueba → comprobación del proveedor mock → confirmación de prueba. No se mueve dinero ni se contratan servicios externos. El aviso explícito aparece al aceptar condiciones y en pago/comprobante; no hay banners de fases o coste en la navegación.

## Ejecutar

```bash
docker compose up -d postgres mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev --hostname 127.0.0.1
pnpm workflows:run
```

Mailpit: http://127.0.0.1:8025. Se utiliza su API HTTP local de envío, sin SDK ni SMTP remoto. Los mensajes van exclusivamente a alias ficticios `@example.test`. WhatsApp es un registro local visible en la reserva, sin conexión a Meta. Las notificaciones se generan desde eventos persistidos con correlation ID; una interrupción deja la cola recuperable. El comando procesa hasta diez eventos por ejecución, tres intentos por canal con espera de 60/120/180 segundos. Tras agotar intentos, la entrega queda fallida y visible; no reabre el pago. La entrega de correo es al menos una vez: una caída entre la aceptación de Mailpit y el commit puede repetir un mensaje, aunque su MessageID es estable. No afirmar entrega exactamente una vez.

El mismo mantenimiento procesa diez reversiones pendientes, revisa cincuenta aprobaciones y elimina el nombre del responsable tras treinta días. Ejecutarlo regularmente; no hay cron instalado automáticamente. La retención del resto del ledger y la eliminación de cuentas quedan para operación/robustez.

## Identidad y permisos

`/account` permite registrar un alias y contraseña de al menos doce caracteres. scrypt con salt aleatorio; sesión opaca de 48 h guardada como hash, cookies HttpOnly/SameSite Strict y Secure con HTTPS. La sesión de visitante se vincula al cliente; salir revoca sesión y cookies. La cotización anónima conserva su acceso desde el navegador original. Las reservas del cliente son consultables desde su cuenta. No se aceptan customerId, roles ni importes de proveedor suministrados por el navegador.

La autenticación es exclusivamente local en modo demo. No incluye recuperación de contraseña, MFA, cuentas productivas ni límites distribuidos. Diez intentos de acceso por minuto/proceso, veinte mutaciones por minuto/sesión, veinte reservas/cuenta, tres intentos de pago/reserva. Todas las rutas controlan propietario en servidor y exigen mismo Origin para mutar. Las aprobaciones están en `/account/approvals` y utilizan la sesión común: roles admin o approver. El registro público solo crea clientes; los roles de personal se habilitan localmente con `pnpm account:role`. `/admin` redirige a Mi cuenta y el acceso por contraseña compartida está retirado.

## Invariantes

- Dinero entero en centavos USD. Total estrictamente mayor de 200000 exige aprobación; exactamente 200000 no. No hay conversión de monedas ni FX inventado.
- Cotizaciones vencen a las 24 h originales. Revalidar crea otra versión si cambia precio o condiciones, sin renovar el vencimiento. Debe aceptarse la versión y total vigentes. El cambio invalida aprobación anterior y vuelve a HITL si corresponde.
- Inventario exclusivamente mock: cupos por paquete/fecha inicializados desde la mayor capacidad de las variantes activas existentes. Las variantes comparten ese pool. No representa disponibilidad comercial. Paquete sin capacidades configuradas no permite reservar. Locks y constraints impiden inventario negativo; pago no bloquea cupos indefinidamente.
- Una solicitud por cotización. Idempotencia por cliente y payload en solicitud; por reserva en checkout; por ID del evento de pago. Doble clic no genera operaciones adicionales.
- Pago local requiere autorización explícita en la pantalla. El servidor emite y verifica un evento con HMAC y frescura de cinco minutos, con importe/moneda de PostgreSQL. No hay webhook público que acepte pruebas o importes del navegador. No se capturan tarjetas.
- Confirmación exige consentimiento, HITL si corresponde, evento verificado, revisión de tarifa/stock y prueba del proveedor mock. Estado final `confirmed_demo`, referencia `MOCK-…`. Nunca se deriva del retorno del navegador o un texto del LLM.
- Pago exitoso con fallo de proveedor/stock/cambio posterior queda `refund_pending`, sin comprobante de reserva. La reversión posterior es otro evento local (`refunded`); no se promete un reembolso real ni instantáneo.
- Aprobación dura hasta una hora o el vencimiento de cotización, lo que ocurra primero. Decisión guarda responsable, motivo y fecha. Rechazo/vencimiento bloquean checkout.

BookerAgent es un adaptador determinista de tools validado con Zod y el cliente autenticado por el servidor: revalidate_quote, create_reservation_request, create_checkout_session y get_booking_status. Prompt `booker-v1` versionado; no se ejecutó un LLM para reservar. No puede aprobar, emitir eventos de pago, confirmar, ejecutar SQL ni elegir otro usuario. Funciona sin Ollama, internet, credenciales comerciales o GPU.

## n8n y contratos

`workflows/n8n/wf_maintenance.json` contiene un disparador manual y llamada autenticada a POST `/api/internal/workflows/process`. Crear en n8n local una credencial HTTP Header Auth `TravelMind local system`, encabezado Authorization con Bearer del token aleatorio configurado en `WORKFLOW_INTERNAL_TOKEN` (mínimo 32 caracteres). Vacío deshabilita la ruta. No guardar el token en el export. La URL localhost requiere mismo host; adaptar solo al host local cuando esté en contenedor. No se instala ni ejecuta n8n en este entorno: JSON y endpoint son artefactos revisables, el comando local realiza el mantenimiento completo sin n8n. El flujo no aprueba reservas ni inicia pagos.

Contratos generados desde Zod: `pnpm api:docs`, `docs/openapi-phase3.json`. Todos retornan `{data}` o `{error:{code,message,correlationId}}`. Solicitud POST `/api/reserve`: 202 con recurso/estado; checkout: 201; propietario ajeno: 404; consentimiento/cambio de precio/estado: 409; vencimiento/stock: 422. Eventos y outbox persisten atómicamente con el cambio de estado. No se registran contraseñas ni el nombre del responsable en eventos/notificaciones.

Migración 0003 agrega cuentas, sesiones, inventario mock, reservas, consentimientos, aprobaciones/decisiones, pagos/eventos, intentos del proveedor, historial y outboxes; añade propietario al visitante y estado de versión de cotización. Rollback exclusivo para base desechable: `src/server/db/rollbacks/0003-reservations.sql`, exige ser la última migración y elimina su información. Nunca ejecutarlo sobre una base con historial necesario.

## Validación y límites

Las pruebas de integración emplean PostgreSQL local `travelmind_admin_test`, sin servicios externos, y cubren umbral exacto, precio cambiado, idempotencia concurrente, autorización, vencimiento, rechazo, firma, discrepancia de importe, fallo del proveedor/reversión y disputa de últimos cupos. Las pruebas unitarias rechazan eventos manipulados, modalidad live y correo real/remoto. Playwright E2E ya está configurado en `pnpm test:e2e`; cobertura y límites en `docs/testing/browser-and-load.md`. La confirmación y pago son siempre simulados; producción, Stripe y Booking permanecen fuera de este incremento. Siguiente fase: métricas operativas, alertas, automatización E2E y robustez.

`pnpm test:smoke` comprueba por HTTP la app local ya iniciada: recomendación → cuenta ficticia → cotización → revalidación → aceptación → reserva idempotente → pago → prueba del proveedor → consulta privada. Crea una cuenta y registros de QA persistentes en la base local; usa una contraseña de fixture, no una credencial real. No ejecutar contra producción. El script conecta a loopback IPv4 y envía el Host/Origin localhost anunciado por Next.js. No sustituye un E2E automatizado de navegador.

Verificación 2026-10-10: recorrido HTTP completo correcto; Mailpit real recibió cuatro mensajes del recorrido, con WhatsApp mock registrado. En navegador: ingreso con la cuenta ficticia, cotización, aceptación mediante teclado, solicitud, autorización de pago de prueba y comprobante. Orden cronológico verificado antes de confirmar; reserva revisada a 320 px sin desbordamiento horizontal. Revisión puntual de accesibilidad, no auditoría WCAG completa. Migración aplicada a la base local y rollback/reaplicación comprobados exclusivamente en `travelmind_admin_test`. Importación/ejecución del export n8n pendiente.

Resultado final: `pnpm test` 44 pruebas, `pnpm test:integration` 29 pruebas, lint, typecheck y build exitosos. Regresión de interfaz cubierta: revalidar una tarifa modificada actualiza el desglose visible y el payload de aceptación a la nueva versión, antes de solicitar la reserva. Endpoint system probado con token válido, inválido, ausente y modo producción bloqueado; sin ejecutar n8n.


