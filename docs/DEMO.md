# Demostración local de TravelMind

TravelMind opera aquí en `APP_MODE=demo`: catálogo y cupos ficticios, pago mock y confirmación `confirmed_demo`. **No realiza cargos ni reservas externas.** No necesita cuenta cloud, tarjeta ni GPU. Docker, Node.js y pnpm deben estar instalados; la primera instalación de paquetes, imágenes, Chromium y modelos requiere red y espacio local. Después, el recorrido funciona sin internet.

## Arranque

Desde la raíz del repositorio:

```bash
pnpm install --frozen-lockfile
pnpm demo:start
```

`demo:start` crea `.env.local` a partir de la plantilla solo si falta, sincroniza un token local sin mostrarlo, levanta PostgreSQL, Mailpit, n8n y Ollama, aplica migraciones no destructivas, verifica el seed sin sobrescribir ediciones, indexa el catálogo y activa los seis workflows si no estaban activos. Descarga los dos modelos Ollama únicamente si faltan; si la descarga no es posible, la recomendación determinista sigue funcionando. Abre Next.js en `http://127.0.0.1:3000`, o avisa si ya responde allí. Deja esta terminal abierta: n8n necesita Next.js disponible para que sus tareas periódicas terminen bien. `Ctrl+C` detiene Next.js, pero conserva contenedores y volúmenes.

Comprobar servicios: `docker compose --profile ai ps`; salud de la app: `curl -fsS http://127.0.0.1:3000/api/health`. Mailpit está en `http://127.0.0.1:8025` y el editor n8n local en `http://127.0.0.1:5678`. Los puertos de servicios se vinculan a loopback. El editor es para desarrollo interno, no para clientes.

## Recorrido de cliente

1. Abrir `/packages`; buscar, filtrar y revisar una ficha. Las imágenes, precios y disponibilidades proceden del catálogo demo local.
2. Abrir `/chat`, pedir una experiencia (por ejemplo «Quiero visitar Cusco sin trekking»), revisar razones y fuentes del catálogo. Si Ollama no responde, el resultado usa el filtro determinista, sin consultar una API pagada.
3. Crear una cuenta ficticia en `/account` con alias y contraseña propia de al menos 12 caracteres. La administración aparece en **Mi cuenta** según el rol de esa misma cuenta; no existe un acceso admin separado.
4. Solicitar una cotización, comprobar desglose y vigencia de 24 horas, y revalidar la tarifa. Aceptar las condiciones y el precio actualizado antes de crear la solicitud.
5. Si el total **supera** USD 2 000, un usuario con rol `approver` o `admin` debe resolver la aprobación en `/account/approvals`. Un total de USD 2 000 exactos no activa ese umbral. La aprobación pendiente o rechazada no inicia pago.
6. Completar el checkout **simulado**. Verificar en `/reservations` la referencia y el estado «Confirmación de prueba». La vista advierte que no hubo cargo ni reserva externa. Los correos de la prueba aparecen en Mailpit; WhatsApp es un registro mock local.

Para demostrar roles de personal, crear primero una cuenta ficticia desde `/account`; después, en otra terminal, ejecutar `pnpm account:role <alias> admin` o `pnpm account:role <alias> approver`. El cambio revoca la sesión anterior; ingresar de nuevo. No hay credenciales predeterminadas ni contraseñas en el repositorio. `travel_agent` atiende únicamente casos asignados; `admin` ve `/account/operations`, catálogo, incidencias y entregas agotadas.

## Comprobaciones reproducibles

Con la aplicación en `127.0.0.1:3000` y Docker levantado:

```bash
pnpm test:smoke
pnpm workflows:dispatch
pnpm workflows:replay-check
pnpm ai:evaluate
pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e
```

`test:smoke` crea datos ficticios en la **base de desarrollo** para recorrer consulta → recomendación → cotización → revalidación → consentimiento → pago mock → `confirmed_demo`; no elimina esos registros. `test:integration` usa `travelmind_admin_test` y `test:e2e` usa `travelmind_e2e_test`; la preparación E2E vacía **solo** su base de prueba. Nunca apuntar esas variables a la base de desarrollo o a una base con datos que se deban conservar.

Los seis workflows (mantenimiento, consulta, cotización, reserva, notificaciones y excepciones) están activos cada cinco minutos. Los cinco de negocio reciben además eventos persistidos en PostgreSQL mediante webhooks locales; Next.js valida identidad, autorización, idempotencia y estados. `pnpm workflows:dispatch` reenvía eventos vencidos tras una caída de n8n. `workflows:replay-check` reenvía un evento de reserva ya completado y comprueba que no duplica pagos, reservas ni entregas. Para auditar el **disparador horario**, usar el procedimiento de copia SQLite+WAL+SHM de [Operación local](runbooks/operations.md); no confundir una ejecución manual o webhook con una ejecución `mode=trigger`.

## Fallos que se pueden mostrar sin cobros

- Cotización vencida o tarifa cambiada: la solicitud se bloquea o exige una nueva aceptación.
- Aprobación rechazada: el checkout queda bloqueado.
- Inventario mock agotado tras el pago verificado: el estado pasa a reversión simulada, nunca a confirmación.
- Mailpit caído: la reserva sigue consultable y la entrega queda recuperable; el personal puede reabrir un intento agotado con auditoría.
- Ollama caído: búsqueda/recomendación determinista local. n8n caído: los eventos persisten y se despachan al restaurarlo.

Las pruebas de navegador cubren estos estados sin usar credenciales externas. Los percentiles del panel y de `ai:evaluate` describen solo esta máquina y sus muestras locales; no prueban capacidad productiva ni cumplimiento WCAG completo. Los pasos de recuperación y las limitaciones de seguridad están en [Operación local](runbooks/operations.md) y la [auditoría del MVP](mvp-audit-2026-10-11.md).
