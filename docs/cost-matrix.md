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