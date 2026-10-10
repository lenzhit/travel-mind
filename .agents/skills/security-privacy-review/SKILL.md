---
name: security-privacy-review
description: >-
  Revisa amenazas, RBAC, secretos, PII y abuso de tools en TravelMind antes de
  cerrar cambios de auth, pagos, reservas, RAG o webhooks. Usar en revisiones
  de seguridad y en merges de esas áreas.
metadata:
  author: travelmind
  version: "1.0"
  project: travelmind
---

# Revisión de seguridad y privacidad

## Propósito

Buscar fallos explotables en el cambio concreto: acceso a objetos ajenos, secretos filtrados, confirmación falsa de pago y documentos RAG tratados como instrucciones. La revisión produce hallazgos con severidad. No afirma cumplimiento PCI, ni una certificación, ni que el prototipo soporta 10 000 consultas mensuales.

## Cuándo activar

- Antes de dar por cerrado auth, RBAC, cotización, reserva, pago, webhook, RAG o un endpoint interno.
- Cuando el diff toca `src/lib/env`, seeds, logs, prompts o `workflows/n8n/`.
- Si la tarea pide un threat model. Escribirlo en `docs/security-threat-model.md` solo entonces.

## Precondiciones

- Leer el diff, no solo el resumen. Incluir tests y `.env.example`.
- Roles: `guest`, `customer`, `travel_agent`, `approver`, `admin`, `system`. El de `system` no reutiliza la sesión de un admin.

## Procedimiento

1. Delimitar superficie del diff: rutas, tablas, tools, eventos y datos de viajeros.
2. Autenticación y objeto: cada lectura de cotización, reserva, pago y aprobación filtra por el actor. Probar con dos usuarios demo. Un id adivinado de otro cliente responde 404 o 403 sin filtrar si existe, de forma consistente en esa ruta.
3. RBAC de servidor. Ocultar un botón no cuenta. `approver` no aprueba su propia solicitud si la historia exige segregación. `guest` no llega a checkout.
4. Secretos: buscar en el diff `sk_live`, `sk_test`, `whsec_`, contraseñas, tokens de n8n y connection strings con credenciales distintas del ejemplo local `postgres:postgres`. `.env.example` solo tiene placeholders. Nada de eso en prompts, logs ni JSON de workflow.
5. Pagos: no hay campos de PAN/CVV. El webhook exige firma o sello del mock. `livemode: true` se rechaza. El navegador no confirma.
6. RAG y agentes: el texto recuperado no se concatena como system prompt. La allowlist de tools está en servidor. El modelo no recibe DSN ni cookies.
7. Entradas: validación de esquema, límite de tamaño, rate limit en chat, cotización anónima y login. URLs de integración con allowlist (SSRF).
8. Datos de viajeros: mínimos, sin documento completo en el email de Mailpit, retención mencionada donde se crea la columna. Seeds en `@example.test`.
9. Cabeceras y CSRF acordes al esquema de auth que exista. No inventar un informe de penetración. Si no hay suite auth todavía, el hallazgo es "auth pendiente", no un falso "aprobado".
10. Clasificar: crítico (hay que corregir antes de usar el flujo), alto, medio, bajo. Cada hallazgo cita archivo y escenario. El correctivo propone el control, sin explotar el fallo con un procedimiento de ataque.

## Herramientas permitidas y restricciones

- Permitido: lectura del diff, tests de autorización, `pnpm test` local.
- Prohibido: explotar el hallazgo contra un host que no sea localhost, pegar secretos reales en el informe, y desactivar un control para "ver si pasa".
- No recomendar un WAF de pago como condición del MVP.

## Buenas prácticas

- Un hallazgo, una evidencia. Si no se pudo ejecutar el test, decirlo.
- Preferir 404 uniforme cuando la existencia del id es sensible.
- `correlation_id` sí; cuerpo de la tool con nombres de viajeros, no.
- Separar amenaza de demo (confundir simulación con cargo) de amenaza de acceso (IDOR).

## Validaciones y criterios de aceptación

- [ ] Quedó probado el caso del usuario ajeno en cada recurso nuevo, o figura como hallazgo.
- [ ] El diff no añade secretos.
- [ ] HITL y el evento de pago no se pueden saltar llamando al route handler a mano.
- [ ] El informe no dice "PCI compliant" ni "cumple OWASP" en bloque. Lista controles verificados y huecos.
- [ ] Los críticos tienen corrección o quedan bloqueando el cierre, con acuerdo explícito de la tarea.

## Errores frecuentes

- Revisar solo la UI.
- Aprobar porque el mock "no es producción". El IDOR del mock enseña el mismo bug.
- Copiar un threat model genérico sin nombrar cotización, HITL y `confirmed_demo`.
- Registrar el prompt de prueba con datos de un viajero real.

## Entregables

Lista de hallazgos (severidad, archivo, escenario, corrección) y los tests de autorización añadidos si la tarea incluye el arreglo. Huecos no ejecutados se nombran como no verificados.

## Ejemplo

`GET /api/quotes/:id` usa el id del cliente enviado en query. Hallazgo crítico: IDOR. Corrección: ignorar ese query y resolver el dueño desde la sesión, con test de dos usuarios demo.
