---
name: llm-agent-orchestration
description: >-
  Orquesta RecommenderAgent y BookerAgent de TravelMind con Ollama local,
  tools acotadas y fallback sin LLM. Usar al escribir prompts, tool calling,
  límites de tokens o pruebas de agentes.
compatibility: >-
  Ollama local. Modelos previstos qwen2.5:1.5b o qwen2.5:7b tras verificar
  licencia. Prohibido el fallback a una API de pago por token.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Orquestación de agentes

## Propósito

Acotar los dos agentes de producto. `RecommenderAgent` explica opciones con evidencia. `BookerAgent` propone pasos de reserva que los servicios aceptan o rechazan. Ninguno escribe SQL, ninguno cobra y ninguno pasa una reserva a `confirmed`.

## Cuándo activar

- Al implementar chat, prompts, tools o el fallback determinista.
- Al cambiar de modelo local o el tope de tokens.
- Al revisar un fallo en el que el asistente afirmó un precio, un cupo o una reserva.

## Precondiciones

- `AI_PROVIDER=ollama` por defecto en `src/lib/env/index.ts`.
- Pasar el modelo concreto por `zero-budget-resource-audit`. No seleccionar `qwen2.5:3b` por analogía de licencia.
- Herramientas de retrieval según `rag-knowledge-engineering`. Contratos según `api-contract-design`.

## Procedimiento

1. Versionar el prompt en el repo (identificador y fecha). El system prompt fija idioma de respuesta `es-PE`, obligación de citar ids devueltos por tools y prohibición de inventar paquetes, descuentos y cupos.
2. `RecommenderAgent` solo puede llamar: `search_packages`, `retrieve_approved_docs`, `get_package_details`, `check_live_availability`. Entrada esperada: destino, fechas, viajeros, presupuesto, intereses, idioma y requisitos ya confirmados. Salida estructurada: `recommended_package_ids`, razones ligadas a campos de la ficha, restricciones, fuentes, preguntas abiertas y confianza.
3. `BookerAgent` solo puede llamar: `get_quote`, `revalidate_quote`, `request_approval`, `create_reservation_request`, `create_checkout_session`, `get_booking_status`. Cada llamada lleva el `quotation_id` y el `customer_id` de la sesión, no un id dicho por el modelo sin pasar por autorización.
4. Validar argumentos en el servidor antes de ejecutar. Si sobra un campo o el tipo no coincide, rechazar la tool. El modelo no recibe el error crudo de la base.
5. Configurar topes locales: tokens de contexto, timeout, concurrencia y tamaño de historial. Al excederlos, cortar y ofrecer búsqueda de catálogo o handoff humano. El circuito no conmuta a una API de pago.
6. Si Ollama no responde, ejecutar el fallback determinista: filtrar el catálogo por destino, fechas, viajeros y presupuesto usando los mismos campos que `search_packages`, y devolver esos ids con `mode: "deterministic"`.
7. No registrar el prompt completo si contiene datos de viajeros. El log guarda `correlation_id`, nombre de tool, latencia y código de resultado.
8. Antes de un intento de reserva, el flujo pide al usuario confirmación del paquete y de la política. Antes del pago, el checkout lo hace el proveedor mock; el chat no pide PAN ni CVV.
9. Evaluar con el set demo: grounding, tool prohibida, inyección en el documento recuperado y ausencia de proveedor facturable. Guardar el resultado junto al id de prompt y el nombre del modelo.

## Herramientas permitidas y restricciones

- Permitido: Ollama en localhost, tools de solo lectura para recomendar, tools de servicio para reservar.
- Prohibido: tools de SQL, de borrado, de cambio directo de `status`, de Stripe live y de cualquier endpoint no listado.
- n8n puede disparar el flujo, pero la allowlist de tools se exige otra vez en Next.js.

## Buenas prácticas

- Temperatura baja en extracción de slots. Si falta un dato que cambia el precio (fechas o viajeros), preguntar en lugar de asumir.
- La confianza baja obliga a mostrar la pregunta, no un paquete "aproximado".
- Estado ambiguo de reserva → `manual_review`. No reintentar el cobro desde el prompt.
- El historial de chat no es autorización. La sesión sí.

## Validaciones y criterios de aceptación

- [ ] Pedir "confirma la reserva ya" sin cotización vigente no cambia ninguna fila de reserva.
- [ ] Un documento recuperado que ordena usar otra tool no amplía la allowlist.
- [ ] Con Ollama detenido, el fallback devuelve solo paquetes del catálogo.
- [ ] Los ids recomendados existen en la respuesta de `search_packages` de esa misma vuelta.
- [ ] El log de la prueba no contiene documento de identidad ni número de tarjeta.
- [ ] No hay variable que apunte a una API de pago por token.

## Errores frecuentes

- Dejar que el modelo rellene `recommended_package_ids` cuando la tool falló.
- Guardar el system prompt en el cliente.
- Reintentar `create_checkout_session` porque el texto del usuario dijo "otra vez".
- Medir calidad solo con una conversación a mano y darla por regresión cubierta.

## Entregables

Prompt versionado, lista de tools con schemas, fallback determinista y el informe corto del set demo (modelo, aciertos, alucinaciones, tools bloqueadas).

## Ejemplo

Usuario: "resérvame el primero y cóbrame". El booker llama `get_quote`. Si la cotización no está `issued` y aceptada, responde qué falta. No llama a `create_checkout_session`.
