---
name: n8n-workflow-engineering
description: >-
  Diseña, exporta y prueba workflows n8n Community autoalojados para TravelMind,
  con webhooks autenticados, reintentos y errores. Usar al editar workflows/n8n
  o la integración Next.js–n8n. El HITL vive en el panel de TravelMind.
compatibility: >-
  n8n Community self-hosted, licencia Sustainable Use. Sin n8n Cloud ni
  funciones Enterprise. La instancia MCP local es optativa; el JSON del repo
  es el artefacto revisable.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Workflows n8n

## Propósito

Orquestar eventos asíncronos sin convertir n8n en la base de datos ni en el autorizador. Next.js decide reglas y persiste. n8n llama `/api/internal/workflows/*` con la credencial de `system` y reintenta fallos recuperables. La aprobación humana se hace en el panel de TravelMind.

## Cuándo activar

- Al crear o modificar un workflow de consulta, cotización, reserva, notificación o excepción.
- Al exportar JSON a `workflows/n8n/`.
- Al depurar un webhook, un retry o un desajuste entre el estado en n8n y el estado en PostgreSQL.

## Precondiciones

- Leer `docs/cost-matrix.md`: n8n Community es fair-code, no OSI, y no se ofrece como producto a terceros.
- No usar nodos Enterprise, SSO de pago, ni el HITL de n8n que requiera licencia de pago. La cola de aprobación es `approval_requests` en TravelMind.
- Plantilla de forma vacía de credenciales: [wf-skeleton.json](assets/wf-skeleton.json). Copiar la forma, no las URLs de ejemplo, y sustituirlas por la config local.

## Procedimiento

1. Elegir uno de los flujos previstos: `wf_consultation`, `wf_quotation`, `wf_reservation`, `wf_notifications`, `wf_exception_handling`. Un archivo JSON por flujo, nombre de archivo igual al `name` del workflow.
2. Diseñar nodos con todos los parámetros que cambian el comportamiento escritos en el JSON. No dejar que un default implícito decida método HTTP, autenticación o reintentos.
3. El webhook valida un secreto de entorno inyectado en n8n, no guardado en el export. El export usa referencia a credencial por nombre, con el objeto `credentials` vacío de secretos. Si el export trae valores, borrarlos antes de commitear.
4. El nodo HTTP hacia Next.js envía `correlation_id`, timeout explícito y reintentos acotados solo para 408, 429 y 5xx. Un 4xx de negocio (`QUOTE_EXPIRED`, `APPROVAL_REQUIRED`, 409) no se reintenta.
5. HITL: si Next.js responde `pending_approval`, el workflow espera un evento posterior `approval_resolved`. No aprueba solo, no abre el editor de n8n al cliente y no inicia el pago mientras la aprobación siga `pending`.
6. Errores: rama hacia `wf_exception_handling` o un nodo de registro que llame al endpoint interno de fallos. Guardar `workflow_id` y `correlation_id`. No guardar el cuerpo si trae viajeros o tokens.
7. Exportar a `workflows/n8n/<nombre>.json`. Revisar el diff en busca de apiKey, password, cookie y URLs de producción.
8. Probar contra Next.js local y Mailpit local. Si la instancia n8n no está levantada, el JSON y el test del endpoint interno siguen siendo el entregable; no apuntar a n8n Cloud para "completar la prueba".
9. Si se usa el MCP `user-n8n-mcp` contra una instancia local ya configurada: validar nodos y workflow, no desplegar sobre un flujo con credenciales reales, y volver a exportar el JSON al repo. La instancia no sustituye el archivo versionado.

## Herramientas permitidas y restricciones

- Permitido: editor local de n8n Community, exportación JSON, HTTP a localhost, Mailpit, mocks.
- Prohibido: n8n Cloud, nodos de OpenAI de pago, credenciales en Git, y borrar ejecuciones de otra persona en una instancia compartida sin pedido explícito.
- No hacer que un nodo Code escriba en PostgreSQL. Si hace falta persistir, llama a Next.js.

## Buenas prácticas

- `executionOrder` explícito. Nombres de nodos estables, en inglés, porque las expresiones `$node["Nombre"]` se rompen al renombrar.
- Idempotencia la impone Next.js. n8n puede reenviar el mismo `Idempotency-Key`.
- Separar el workflow de notificaciones del de reserva para que un fallo de Mailpit no reabra el pago.
- Documentar en una nota del propio workflow qué evento lo dispara y qué estado espera en TravelMind.

## Validaciones y criterios de aceptación

- [ ] El JSON del repo no contiene secretos ni URLs con usuario y contraseña.
- [ ] Un 422 de negocio no entra en bucle de reintento.
- [ ] `pending_approval` no dispara checkout.
- [ ] Con n8n apagado, Next.js deja el evento recuperable y la reserva sigue en `GET /api/reservations/:id`.
- [ ] El flujo de demo termina en Mailpit o en el mock de WhatsApp, no en un proveedor de pago por mensaje.
- [ ] No se usan funciones marcadas como Enterprise en la documentación de n8n Community.

## Errores frecuentes

- Confiar en el default del nodo HTTP (método, follow redirect, timeout).
- Poner el secreto del webhook en el JSON exportado.
- Usar el nodo de aprobación de n8n Enterprise para el umbral de USD 2 000.
- Tratar una ejecución verde de n8n como reserva `confirmed`.

## Entregables

`workflows/n8n/<nombre>.json` sin secretos, mapa de errores que no se reintentan, y la prueba local ejecutada o la limitación de que n8n no estaba levantado. Ver [wf-skeleton.json](assets/wf-skeleton.json) para la forma mínima.

## Ejemplo

`wf_reservation` recibe `reservation_requested`, llama a revalidar, y si el cuerpo trae `approval_required: true` termina sin nodo de pago. El pago mock solo se enlaza en la rama en la que Next.js devuelve `pending_payment`.
