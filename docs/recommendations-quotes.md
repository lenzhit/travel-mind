# Recomendaciones y cotizaciones — 2026-10-10

## Recorrido implementado

Abrir `/chat`, describir un viaje, indicar viajeros, presupuesto total USD y fecha opcional. Las recomendaciones muestran hechos y fuentes del catálogo aprobado. Elegir fecha y viajeros para emitir una cotización; también puede solicitarse desde la ficha del paquete. El enlace solo funciona en el navegador que conserva su cookie de visitante. No hay reserva ni pago en esta fase.

La interfaz conserva el lenguaje de negocio: no muestra fases, presupuesto de desarrollo, proveedores internos ni banners globales de demo. El desglose aclara que no confirma reserva ni cargo. Los registros internos siguen marcados `mode=demo`. Al implementar el pago y la confirmación simulados se necesitará su aviso específico, sin presentar operaciones mock como reales.

## Preparación local

```bash
pnpm db:migrate
pnpm db:seed # Idempotente; conserva ediciones administrativas
pnpm rag:index
pnpm dev --hostname 127.0.0.1
```

Se necesitan Node 24, pnpm y PostgreSQL con pgvector del entorno existente. El recorrido catálogo → recomendación → cotización funciona con CPU y sin Ollama, GPU, internet ni cuentas externas una vez instaladas las dependencias. Perfil inicial sugerido para el fallback: 2 núcleos, 4 GB de RAM; no es una medición de capacidad productiva. No se han medido CPU/RAM ni calidad de modelos en este equipo.

Ollama es opcional para mejorar el ranking. Solo se acepta HTTP loopback; sin credenciales, redirecciones ni hosts remotos. No hay descarga automática ni proveedor facturable de respaldo. Los modelos están fijados a `qwen2.5:1.5b-instruct-q4_1` y `nomic-embed-text:v1.5` (768 dimensiones). Después de instalarlos manualmente desde su distribuidor oficial:

```bash
pnpm rag:index -- --embed
```

Este comando indexa documentos aprobados y añade embeddings secuencialmente. Si Ollama falla, conserva los fragmentos textuales. En la verificación actual existen 14 documentos aprobados; no se descargaron modelos y hay cero embeddings reales. La integración con pgvector y la API de Ollama se comprobó mediante respuestas controladas, no mediante inferencia real.

Límites configurables en `.env.example`: `AI_TIMEOUT_MS` 100–5000 (predeterminado 5000), `AI_CONTEXT_TOKENS` 1024–4096 (2048), `AI_OUTPUT_TOKENS` 64–512 (256), `AI_CONCURRENCY` 1–2 (2, por proceso). Valores inválidos usan el predeterminado. Respuesta máxima 64 KiB, documentos de hasta 450 caracteres × 6 en el prompt, salida hasta tres IDs, dos hilos CPU. Tres fallos de transporte abren circuito durante 60 segundos. Modelos ausentes, timeout, respuesta inválida, IDs desconocidos o tool calls activan la selección determinista. Los fallos no se muestran como detalles técnicos al viajero; el resultado sigue explicando su fuente y la necesidad de reconfirmación.

## Capas y contenido aprobado

Next.js aplica autorización, filtros, precio y persistencia. El recomendador es de solo lectura: selecciona IDs, no usa SQL generado ni tools de escritura. El JSON de Ollama se valida; cualquier texto comercial mostrado se construye desde campos del catálogo. No se guardan mensajes ni prompts completos y no se envían datos de sesión al modelo.

`catalog-v1` convierte el JSON aprobado a texto, fragmenta en 1000 caracteres con solapamiento de 150 y hash SHA-256. Fragmentos, modelo y vectores se guardan en `rag_chunks`. Nomic recibe prefijos `search_document:` / `search_query:`. Recuperación restringida a paquete y destino activos, documento aprobado, ACL pública e idioma es-PE; versiones anteriores y contenido retirado quedan fuera. Las ediciones administrativas publican la nueva versión y sus fragmentos en la misma transacción. Las versiones conservadas permiten auditoría; sus embeddings no se reutilizan para la nueva versión.

Filtros duros: destino identificado/seleccionado, presupuesto total dividido entre viajeros, moneda USD y exclusión conservadora de trekking consultando también el itinerario. La búsqueda semántica usa distancia coseno pgvector; sin vectores/Ollama usa coincidencias del catálogo. Fuera de un destino identificado exige relevancia positiva (umbral semántico inicial 0.35, pendiente de calibración real). Hasta 50 candidatos y seis candidatos de contexto; diseño de MVP, no prueba de escala. La comprensión de lenguaje natural es limitada; no infiere disponibilidad, edad, necesidades médicas o preferencias sensibles. Viajeros/fecha/presupuesto explícitos del formulario tienen prioridad. Las fechas se validan en el servidor; no se promete stock desde RAG.

## Cotización e invariantes

`MockTravelProvider` lee tarifas actuales del paquete o variante; valida capacidad de la variante, fecha real no pasada en America/Lima y moneda USD. Política `catalog-inclusive-v1`: tarifa íntegra del catálogo por viajero × cantidad; cargos adicionales separados, descuento e impuestos adicionales iguales a cero por política del proveedor mock, no estimación de impuestos reales. Sin conversiones inventadas. Dinero entero en unidades menores y rechazo de overflow. Total estrictamente mayor de USD 2000 deja `requiresApproval=true`; no inicia cobro ni aprobación en esta fase.

`quotations` almacena sesión propietaria, emisión, vencimiento, estado, clave de idempotencia y hash de payload. `quotation_versions` conserva snapshot inmutable versión 1 (precio, desglose, inclusiones/exclusiones, fecha, viajeros, fuente y fecha de tarifa). La versión de un paquete y la versión de una cotización son distintas. Una nueva solicitud emite otra cotización, no modifica la anterior. Las revisiones de precio, aceptación renovada y supersesión antes de pago corresponden a la siguiente fase.

Vigencia exacta 24 horas verificada mediante constraint SQL. La consulta marca `expired` desde el instante del vencimiento y la pantalla actualiza ese estado cada segundo. `pnpm quotes:expire` materializa vencimientos sin esperar a una lectura (puede ejecutarse desde el scheduler local). No se renueva una cotización al repetir una clave. Dos solicitudes concurrentes con la misma sesión/clave/payload devuelven el mismo recurso; cambiar el payload con esa clave devuelve 409. Bloqueos de lectura evitan tarifas parcialmente editadas durante la emisión.

## Contratos HTTP

Éxito `{ data }`; error `{ error: { code, message, correlationId } }`. Respuestas privadas `Cache-Control: no-store`. Mutaciones con Origin del mismo sitio, JSON estricto y máximo 64 KiB. La fecha tiene formato YYYY-MM-DD; presupuesto y tarifas son enteros de centavos USD.

| Método y ruta | Entrada / resultado |
|---|---|
| POST `/api/visitor/session` | Crea/reutiliza cookie; `{ ready: true }`, nunca expone token en JSON |
| POST `/api/chat` | `{ message, travelers?, budgetMinor?, departureDate?, destinationId? }`; recomendaciones, fuentes, preguntas, preferencias y modo técnico |
| POST `/api/quote` | `{ packageId, variantId?, travelers, departureDate }`; header `Idempotency-Key` UUID obligatorio; 201, snapshot y vigencia |
| GET `/api/quotes/:id` | Cotización autorizada al visitante actual; 404 para ID ajeno o inexistente |

Errores: 400 contrato/clave inválidos, 401 sesión ausente/vencida, 403 origen ajeno, 404 recurso ajeno/retirado, 409 reutilización de clave con otro payload, 422 fecha/variante/capacidad/moneda/importe no admitidos, 429 límite, 503 servicio local no disponible. Contrato OpenAPI 3.1 generado en `docs/openapi-phase2.json`; regenerar con `pnpm api:docs` tras cambiar los esquemas o DTO.

## Seguridad, privacidad y operación

Sesión anónima opaca de 48 horas, token aleatorio de 256 bits, solo hash SHA-256 en DB; cookie HttpOnly/SameSite Strict y Secure bajo HTTPS. Sin PII ni roles administrativos. Hasta 20 mutaciones/minuto/sesión, 20 cotizaciones/sesión y 30 sesiones nuevas/minuto/global, con bloqueos transaccionales. Límite global de creación adecuado al entorno local académico, no protección distribuida contra DoS. Cuenta customer, recuperación entre dispositivos y revocación de usuario pendientes antes de reserva.

Retención objetivo de cotizaciones/sesiones: 30 días para esta demostración. Aún no existe tarea automática de purga; requiere política definitiva antes de recolectar datos de viajeros. Versiones documentales/auditoría se conservan, sin prompts completos. Logs de recomendación y cotización incluyen correlation_id, modo y latencia/count, nunca tokens ni cuerpos de mensajes. No se ha conectado n8n a este flujo síncrono; Next.js conserva todas las reglas.

Migración `0002_ordinary_swarm.sql`: tablas `visitor_sessions`, `rag_chunks`, `quotations`, `quotation_versions`, FKs, unicidad y vencimiento. Rollback de desarrollo `src/server/db/rollbacks/0002-recommendations-quotes.sql`; elimina exclusivamente estas tablas y requiere que sea la última migración. Usar solo base desechable y respaldo si hay historial necesario. No ejecutarlo sobre la base compartida/de trabajo.

## Validación y pendiente

Dataset `tests/fixtures/recommendation-evaluation.ts`: Cusco sin trekking, arquitectura en Arequipa, playas de Máncora y cultura en Titicaca. Se verifican IDs/tarifas procedentes del catálogo, fuentes, falta de resultados y no creación de reservas por instrucciones maliciosas. Pruebas adicionales cubren ACL, documentos superseded/archivados, dimensión vectorial, tool calls, IDs inventados, circuito, host remoto, umbral exacto, fecha/overflow, expiración, propietario y concurrencia.

Siguiente incremento: autenticación customer, solicitud de reserva, revalidación de precio/disponibilidad, aceptación, HITL y pago local simulado. No hay todavía cobro, reserva confirmada, notificaciones ni recorrido E2E de fase 3.


Verificación final (2026-10-10): 39 pruebas unitarias/componentes y 16 de integración con PostgreSQL exitosas; lint, TypeScript y build correctos. Rollback 0002, reaplicación e indexado comprobados exclusivamente en travelmind_admin_test. Navegador: consulta, fuente, cotización con teclado, foco en resultados y revisión móvil a 320 px sin desbordamiento horizontal. No constituye auditoría WCAG completa ni E2E automatizado de Playwright.