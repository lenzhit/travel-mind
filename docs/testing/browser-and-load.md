# Pruebas de navegador y carga local

## Preparación sin cuentas externas

Playwright 1.64.0 y Chromium headless están instalados como recursos locales. Licencia y condiciones: `docs/cost-matrix.md`. Node 24, pnpm 10 y PostgreSQL/pgvector locales. Después de instalar paquetes y navegador, los tests no requieren internet, Ollama, GPU, tokens, Mailpit ni proveedores comerciales.

```bash
pnpm install
pnpm exec playwright install chromium # Descarga inicial, solo la primera vez
pnpm test:e2e
```

En Linux, si faltan librerías del sistema, usar el instalador oficial `pnpm exec playwright install-deps chromium` antes de probar; requiere permisos del gestor de paquetes. No se necesitó en este equipo. El comando E2E compila primero y abre una instancia de Next.js en loopback:3100; exige puerto libre y no reutiliza otro servidor.

La configuración fija exclusivamente `travelmind_e2e_test` en PostgreSQL localhost. La preparación crea esa base si falta (la cuenta local necesita permiso CREATEDB), migra y limpia sus tablas con CASCADE antes de sembrar. Es una base desechable de QA: no guardar información útil allí. Al terminar se eliminan cuentas, sesiones y sus operaciones de esta base; conserva el catálogo de QA. Nunca usa ni limpia `travelmind` o `travelmind_admin_test`. No ejecutar E2E e integración simultáneamente si la máquina no tiene recursos suficientes.

La app fija modo demo y adaptadores mock; la IA usa fallback determinista. El navegador bloquea solicitudes a orígenes distintos de localhost:3100. No envía mensajes externos ni datos reales. Cuentas y responsables son ficticios. La aprobación de prueba se habilita mediante fixture en PostgreSQL de test, nunca mediante registro o un campo de rol del navegador.

## Cobertura E2E

1. Registro → recomendación determinista con evidencia → cotización → reconfirmación → consentimiento → solicitud → autorización del evento de pago mock → confirmación explícitamente simulada, con referencia del proveedor mock comprobada en PostgreSQL. Comprobante a 320 px sin desbordamiento horizontal.
2. Cotización vencida respetando el constraint issued_at + 24 h: interfaz bloquea reserva y no persiste solicitud.
3. Cliente sin herramientas internas: API métricas 403 y página protegida redirige. Rol admin otorgado solo por fixture permite entrar al resumen y actualizarlo con teclado.
4. Total mayor del umbral: aprobación pendiente sin botón de pago; cuenta ajena obtiene 404; rol approver rechaza y el cliente ve solicitud rechazada sin acceso al pago.

No hay sleeps, retries que oculten errores ni cuentas cloud. Un worker reduce consumo de recursos; waits/aserciones siguen resultados y estados visibles. Los tests son independientes: cada uno usa contexto y cuentas nuevos; no dependen de reservas de otro test.

`playwright-report/` contiene informe HTML; `test-results/` contiene screenshot de confirmación móvil, y trazas/capturas en fallos. Ambos están ignorados por Git. Solo incluyen fixtures; aun así pueden mostrar sus alias/contraseñas. No usar credenciales reales ni publicar trazas sin revisión. `pnpm exec playwright show-report` abre el informe local. Si un fallo deja datos, el siguiente arranque vuelve a limpiar exclusivamente la base E2E.

## Carga limitada del catálogo

Con la app compilada iniciada en loopback:

```bash
pnpm start --hostname 127.0.0.1
pnpm test:load
```

El script hace cinco lecturas de calentamiento y cien lecturas GET `/api/packages?page=1&pageSize=12`, con cinco trabajadores concurrentes. Comprueba modo demo y respuestas de catálogo con datos. No crea cuentas, cotizaciones ni reservas. Solo acepta origen HTTP de loopback sin credenciales y rechaza redirects. Timeout de cinco segundos por solicitud. Sale con fallo si hay respuestas inválidas o errores; no impone un SLO de latencia sin una línea base.

Variables opcionales: LOAD_BASE_URL (loopback), LOAD_REQUESTS (1–200), LOAD_CONCURRENCY (1–10). Los límites evitan carga accidentalmente ilimitada. El resultado se guarda en `docs/testing/catalog-load-result.json`: tamaño de muestra, concurrencia, calentamiento, errores, tiempo total, p50/p95/máximo, CPU/RAM visible al proceso, sistema y Node. Los percentiles incluyen todos los intentos; revisar errores antes de interpretar la latencia.

Resultado medido 2026-10-10: 100/100 lecturas correctas, cero errores, concurrencia 5, p50 13.45 ms, p95 17.89 ms y máximo 36.48 ms. Tiempo total 290 ms, después de 5 lecturas de calentamiento. Ryzen 5 5600H, 12 CPU lógicas y 11 GiB visibles en WSL/Linux, Node v24.4.1. Se incluye HTTP y lectura/validación de JSON desde la misma máquina. No mide clientes remotos, IA, pagos, ráfagas prolongadas, consumo máximo o 10 000 consultas/mes; no representa capacidad productiva.

## Verificación y continuación

Verificación realizada: 4 E2E en Chromium, 56 pruebas unitarias/componentes, 30 de integración PostgreSQL; lint, typecheck y build correctos. Carga del catálogo sin errores. Sin cambios de esquema ni servicios comerciales; nueva dependencia de desarrollo auditada: Playwright.

Continúa pendiente la operación de casos manuales, retención del resto del ledger, navegación accesible auditada completamente y carga de escenarios de IA/reservas. Los negativos adicionales de precio cambiado, idempotencia, pago manipulado y fallo de proveedor se verifican en integración; no están todos automatizados como E2E de navegador.
