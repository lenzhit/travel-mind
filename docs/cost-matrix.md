# TravelMind — Matriz de recursos y presupuesto cero

> Estado inicial: 2026-10-10. Uso previsto: desarrollo y demostración académica, sin explotación comercial. Antes de adoptar una tecnología, confirmar sus condiciones vigentes en documentación oficial. **Objetivo: USD 0 de pagos exigidos y ningún recurso facturable como dependencia del MVP**.

| Recurso | Función | Licencia / modalidad | Coste requerido para demo | Condiciones, límites y alternativa | Referencia |
|---|---|---|---|---|---|
| Next.js / React / TypeScript | App web y backend | Open source | USD 0 | Autoalojado, sin hosting pago | https://nextjs.org/docs ; https://react.dev ; https://www.typescriptlang.org |
| Tailwind / shadcn/ui / Lucide | UI y componentes | Open source; validar licencias por paquete (Tailwind MIT, Lucide ISC, Radix Slot MIT, CVA Apache-2.0, clsx MIT, tailwind-merge MIT) | USD 0 | Evitar kits premium y assets sin permiso | https://tailwindcss.com ; https://ui.shadcn.com ; https://lucide.dev |
| PostgreSQL | Base de datos | Licencia PostgreSQL | USD 0 | Instancia local; copias de seguridad locales | https://www.postgresql.org/about/licence/ |
| pgvector | Índice semántico | Open source | USD 0 | Extensión en PostgreSQL local | https://github.com/pgvector/pgvector |
| Drizzle ORM / postgres driver | ORM, migraciones y driver DB | Open source (Drizzle Apache-2.0, postgres MIT/PostgreSQL) | USD 0 | Ejecución local en Node/Next.js; migraciones versionadas en repo | https://orm.drizzle.team ; https://github.com/porsager/postgres |
| Zod | Validación de esquemas y contratos | Open source (MIT) | USD 0 | Validación estricta en servidor y runtime | https://zod.dev |
| Ollama | Servidor local de inferencia | MIT | USD 0 | Modelos requieren licencia independiente; CPU/RAM disponibles condicionan latencia | https://github.com/ollama/ollama/blob/main/LICENSE |
| Qwen2.5 1.5B/7B (opcionales) | Modelo LLM de demo | La página de Qwen2.5 indica Apache-2.0 para estas variantes | USD 0 | Comprobar etiqueta y licencia exactas en cada versión/quantización; el modelo 3B no hereda automáticamente la licencia | https://ollama.com/library/qwen2.5 |
| Embeddings locales | Indexación semántica | Depende del modelo elegido | USD 0 | Verificar licencia del modelo y ejecutarlo localmente; no APIs por token | https://ollama.com ; https://sbert.net |
| n8n Community self-hosted | Orquestación y agentes | Sustainable Use License (*fair-code*, **no** OSI-open-source) | USD 0 para la demo académica prevista | No usar funciones Enterprise ni ofrecer acceso a n8n como servicio de terceros; revisar licencia si cambia el uso | https://docs.n8n.io/sustainable-use-license/ ; https://docs.n8n.io/hosting/community-edition-features/ |
| MockTravelProvider | Catálogo/disponibilidad/reserva | Código propio | USD 0 | Datos ficticios visiblemente etiquetados; nunca reserva real | `src/server/providers/` |
| MockPaymentProvider | Pago simulado | Código propio | USD 0 | Eventos simulados, nunca cobro real; pruebas de idempotencia | `src/server/providers/` |
| Mailpit | SMTP de prueba | Open source; validar licencia de versión instalada | USD 0 | Correos interceptados localmente; sin emails reales | https://github.com/axllent/mailpit |
| MockWhatsAppProvider | Mensajes de prueba | Código propio | USD 0 | Outbox visible local; sin envío externo | `src/server/providers/` |
| Stripe sandbox (OPCIONAL) | Probar checkout/webhooks | Servicio de pruebas | USD 0 en transacciones simuladas | No mueve fondos; puede requerir cuenta y acceso; no convertirlo en dependencia del MVP ni activar producción | https://docs.stripe.com/testing |
| Booking.com y otros GDS (FUERA MVP) | Inventario y reserva reales | APIs sujetas a aprobación contractual/comercial | No evaluado como gratuito | **No se utilizarán** salvo autorización y viabilidad jurídica/económica explícitas; siempre mantener mock | https://developers.booking.com/ |
| Vitest / Playwright / Testing Library | Test unitario, componentes y E2E | Open source (Vitest MIT, Testing Library MIT, JSDOM MIT, Playwright Apache-2.0) | USD 0 | Navegadores descargados durante setup; ejecutar localmente sin SaaS | https://vitest.dev ; https://playwright.dev ; https://testing-library.com |
| GitHub Actions (OPCIONAL) | CI | Free allowance sujeto a tipo de repositorio y cuotas | USD 0 dentro del límite | Repos públicos con runners estándar tienen ejecución gratuita; privados tienen cuota; CI local siempre disponible | https://docs.github.com/en/actions/concepts/billing-and-usage |
| Docker Engine + Compose / Podman | Entorno reproducible | Código abierto; revisar condiciones del producto Desktop si se usa | USD 0 | Priorizar motor open source; evitar dependencia de licencia Desktop si deja de ser elegible | https://docs.docker.com/engine/ ; https://podman.io |
| Penpot (OPCIONAL) | Prototipado de UI | Herramienta de diseño open source con autoalojamiento disponible | USD 0 usando opción gratuita/autohospedada | No es necesario para levantar la app | https://penpot.app |
| Recursos visuales / Fotografías | Imágenes de destinos turísticos | CC BY-SA 4.0 / CC BY 2.0 / CC BY 3.0 (Wikimedia Commons) | USD 0 | Autoalojadas localmente en `public/images/destinations/`; atribución documentada en `docs/assets-attribution.md`; sin CDN de pago | https://commons.wikimedia.org |
| Vercel Hobby (OPCIONAL) | Vista pública del frontend | Plan gratuito solo para uso personal/no comercial, sujeto a límites | USD 0 dentro de límites | **No alojará por sí solo PostgreSQL/n8n/Ollama**; no constituye despliegue gratuito completo | https://vercel.com/docs/plans/hobby |

## Reglas de aprobación de nuevas herramientas

### Cambio fase 1B — 2026-10-10

Sin nuevas dependencias, modelos ni integraciones remotas. Autenticación demo con `node:crypto` del runtime Node ya instalado (scrypt, SHA-256 y aleatoriedad criptográfica), PostgreSQL y Drizzle existentes. Operación y pruebas íntegramente locales, sin registro, tarjeta, cuota ni riesgo de facturación. No se activó Ollama ni se descargaron modelos. El recorrido completo de reserva/pago sigue pendiente de fases 2–3; este cambio verifica exclusivamente catálogo y administración.

1. Confirmar licencia exacta, plan gratuito permanente, cuotas, límites de uso académico, requisitos de tarjeta, facturación automática y fecha de revisión.
2. Justificar que cumple una necesidad no cubierta por la pila existente y que mejora el proyecto sin obligar a pagar.
3. Documentar una alternativa local sin cuenta. Toda funcionalidad crítica debe ser probada con el modo `demo`.
4. No usar pruebas gratuitas temporales, créditos promocionales o pago por consumo para superar fallas de diseño.
5. Si cambian las condiciones o se agota una cuota: desactivar la integración y regresar al proveedor mock o al flujo local; no incurrir en cargos.
6. Al pasar de demo a producción comercial, reevaluar licencias, normativa, seguridad, escalabilidad, costes y contratos; **no** asumir que el despliegue a producción será gratuito.

## Criterios de aceptación del presupuesto cero

- [ ] `pnpm dev` y las pruebas locales funcionan sin claves cloud ni tarjetas de crédito.
- [ ] La base de datos, n8n, Mailpit y los proveedores mock se levantan localmente.
- [ ] El catálogo, recomendaciones (Ollama local o fallback determinista), cotización, reserva, aprobación HITL y notificaciones completan el E2E sin pagos externos.
- [ ] Ningún secreto live está presente en `.env.example`, tests, workflows o historial Git.
- [ ] La interfaz distingue simulaciones de reservas/pagos verdaderos.
- [ ] Las licencias de modelos, librerías e imágenes usadas han sido revisadas.
- [ ] Se registran los requisitos aproximados de CPU/RAM/almacenamiento de la demostración.

### Cambio fase 2 — 2026-10-10

Sin nuevas dependencias npm ni servicios remotos obligatorios. Presupuesto obligatorio USD 0; catálogo, sesión, recomendaciones y cotización funcionan con PostgreSQL/Node existentes sin inferencia. Descarga de modelos opcional y manual; no se ejecutó en este entorno.

| Recurso opcional | Propósito/licencia verificada | Límites y riesgo | Alternativa local |
|---|---|---|---|
| [qwen2.5:1.5b-instruct-q4_1](https://ollama.com/library/qwen2.5:1.5b-instruct-q4_1/blobs/832dd9e00a68) | Ranking acotado; Apache-2.0 del modelo, distinto de Ollama MIT; consulta oficial 2026-10-10 | Sin cuenta/tarjeta/cuota de tokens; descarga inicial y almacenamiento local; capacidad depende CPU/RAM. Sin facturación automática ni llamadas cloud | Selección determinista del catálogo |
| [nomic-embed-text:v1.5](https://ollama.com/library/nomic-embed-text:v1.5), [ficha oficial Nomic](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) | Embeddings locales 768 dimensiones, Apache-2.0; consulta oficial 2026-10-10 | Artefacto Ollama 274 MB; descarga inicial opcional, CPU/RAM y disco locales. Sin cuenta, tarjeta ni cobro por consulta | Fragmentos y búsqueda textual sobre documentos aprobados |

APIs oficiales comprobadas: [Ollama chat](https://docs.ollama.com/api/chat) y [embed](https://docs.ollama.com/api/embed). Modelos fijados en código; no asumir licencias de otras variantes. Las pruebas no necesitan Ollama ni internet; pgvector y ranking se ejercitan con respuestas controladas. No se comprobó inferencia real, calidad ni consumo de hardware de los modelos.

### Cambio fase 3 — 2026-10-10

Sin nuevas dependencias npm. Reserva, pago, prueba de proveedor, HITL y WhatsApp se ejecutan localmente con las librerías existentes; no requieren cuentas, tarjetas, cuotas o red después de instalar. Pago mock no factura. No se habilitaron Stripe, Booking, SMTP remoto ni WhatsApp real.

| Recurso | Propósito/licencia/términos | Red, límites y riesgo de cobro | Sustituto local |
|---|---|---|---|
| Mailpit v1.30.1, imagen `axllent/mailpit:v1.30.1` | Captura de mensajes local; [MIT verificada](https://github.com/axllent/mailpit/blob/v1.30.1/LICENSE), [API oficial](https://mailpit.axllent.org/docs/api-v1/); consulta 2026-10-10 | Descarga inicial, sin cuenta ni tarjeta; puertos solo loopback. Sin envío externo ni facturación automática. Disco/RAM del equipo; mensajes del contenedor efímeros al recrearlo. Adapter con timeout 2 s, tres intentos; límites de mantenimiento documentados | Outbox en PostgreSQL y vista de notificaciones; reserva consultable aunque Mailpit esté apagado |
| n8n Community (export, instancia no ejecutada) | Orquestación interna; condiciones source-available ya registradas arriba, sin funciones Enterprise | No se agregó dependencia cloud ni credencial. Endpoint deshabilitado sin token local; importación JSON pendiente de verificación | `pnpm workflows:run`, misma lógica de backend |

Presupuesto obligatorio de licencias/servicios/transacciones: USD 0. Los requisitos de Node/PostgreSQL existentes bastan para el recorrido determinista; Mailpit añade un contenedor ligero, cuyo límite práctico depende del equipo. No se midió capacidad productiva ni consumo máximo de recursos.

### Verificación E2E local — 2026-10-10

Admitido: `@playwright/test` 1.64.0, Apache-2.0 según [licencia oficial](https://github.com/microsoft/playwright/blob/main/LICENSE) y metadatos npm comprobados. Ejecuta navegador y runner locales; [instalación oficial](https://playwright.dev/docs/intro). USD 0: no exige registro, tarjeta, cuota cloud ni suscripción. Descarga inicial de paquetes y Chromium; después las pruebas usan únicamente loopback. El navegador tiene sus licencias y avisos distribuidos con el binario. Límites: CPU/RAM/disco locales, un worker por defecto, timeouts acotados. Sin facturación automática ni cuentas enlazadas. Alternativa sin navegador: Vitest/integración y `pnpm test:smoke`; no sustituye cobertura de UI. Los servicios reales permanecen deshabilitados.

### Operación y retención — 2026-10-11
Sin nuevas dependencias ni servicios. Cola de incidencias y limpieza por lotes implementadas con PostgreSQL/Drizzle existentes. Ejecución local, sin cuentas cloud, cuotas comerciales, tarjeta ni transacciones reales. Conserva el ledger y usa límites de 100 registros por categoría y ejecución.

Atención por roles — 2026-10-11: asignación, notas y cierre local usan PostgreSQL/Drizzle/Zod ya admitidos. Sin dependencia nueva, cuenta externa, mensajes comerciales ni cobros. Límite de 100 decisiones por caso y motivos de 500 caracteres.

### Servicios locales verificados — 2026-10-11

| Recurso y propósito | Licencia / referencia oficial | Requisitos y límites comprobados | Red, cobro y sustituto |
|---|---|---|---|
| `n8nio/n8n:2.42.6`, orquestación interna | [Sustainable Use License](https://docs.n8n.io/sustainable-use-license/) fair-code; [instalación Compose](https://docs.n8n.io/deploy/host-n8n/install-options/install-using-docker-compose/) | Imagen versionada, editor solo en `127.0.0.1:5678`, volumen local persistente. Flujo importado, ejecutado manualmente y publicado cada cinco minutos en la instancia local con autorización explícita. No se usan funciones Enterprise ni n8n Cloud. | Descarga inicial de imagen; sin registro, tarjeta, cuota de ejecuciones cloud ni facturación automática. Sustituto: `pnpm workflows:run`. |
| `ollama/ollama:0.40.3`, inferencia/embeddings CPU | [Ollama MIT](https://github.com/ollama/ollama/blob/main/LICENSE); [imagen oficial](https://hub.docker.com/r/ollama/ollama/tags) | Imagen versionada, puerto `127.0.0.1:11434`, volumen local. En esta máquina WSL: 11 GiB RAM, 12 CPU visibles, 898 GiB libres al iniciar. La imagen comprimida AMD64 indicada por Docker Hub ronda 3.52 GB; se descargó localmente. | Red solo para descarga inicial; sin cuenta, tarjeta o coste por token. Sustituto: recomendación determinista. No implica capacidad productiva. |
| `qwen2.5:1.5b-instruct-q4_1`, ranking acotado | [Licencia Apache-2.0 del artefacto](https://ollama.com/library/qwen2.5%3A1.5b-instruct-q4_1/blobs/832dd9e00a68) | Artefacto local ~1 GB; una inferencia breve y una recomendación con fuentes comprobadas en CPU. Timeout configurable, máximo 30 s; fallback determinista. | Descarga inicial gratuita sin registro ni tarjeta; no proveedor de pago. |
| `nomic-embed-text:v1.5`, vectores 768D | [Ficha del modelo Apache-2.0](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5), [artefacto Ollama](https://ollama.com/library/nomic-embed-text/tags) | ~274 MB; 20 chunks aprobados indexados localmente. | Descarga inicial gratuita; búsqueda de catálogo sin vector disponible como fallback. |

La configuración usa únicamente loopback; n8n alcanza Next.js mediante el puente local de Docker. `WORKFLOW_INTERNAL_TOKEN` se genera en archivos ignorados por Git. El consumo de CPU, RAM, disco y electricidad del equipo no forma parte del cálculo USD 0 de servicios, como define `AGENTS.md`. Se verificaron fuentes oficiales en la fecha indicada; reevaluar condiciones antes de otro uso.

El incremento de cinco workflows y la tabla `consultation_runs` reutiliza n8n, PostgreSQL, Ollama y Mailpit ya inventariados; no añade paquete, servicio remoto ni cuenta facturable. El procesamiento de consultas guarda solo metadatos sin texto y los elimina tras siete días.
