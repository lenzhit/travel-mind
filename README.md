# TravelMind

> **Sistema Inteligente para la Recomendación, Cotización y Reserva de Paquetes Turísticos mediante Agentes de IA.**
> Proyecto de investigación académica desarrollado bajo política estricta de **presupuesto cero (USD 0)**.

---

## 1. Visión general

TravelMind automatiza el ciclo de vida de atención turística B2C (consulta semántica con RAG, cotización verificable, reserva reconfirmada y pago simulado) utilizando agentes de IA y flujos orquestados, sin depender de servicios pagados, tarjetas de crédito ni plataformas comerciales de suscripción.

### Principios clave
- **Presupuesto cero comprobable (USD 0):** Ninguna función crítica depende de APIs de pago por token ni servicios cloud monetizados.
- **Transparencia en precios:** Desglose estricto, vigencia de 24 horas y sin alucinación de inventario.
- **Supervisión humana (HITL):** Aprobación mandatoria para operaciones que superen USD 2 000.
- **Trazabilidad e idempotencia:** Operaciones de pago y reserva protegidas contra duplicidad y fallos de proveedor.

---

## 2. Pila Tecnológica (Fase 0)

| Capa | Tecnología | Licencia / Modalidad |
|---|---|---|
| **Framework Web** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) | MIT (Open Source) |
| **Lenguaje** | [TypeScript 5](https://www.typescriptlang.org/) (modo estricto) | Apache-2.0 |
| **Estilos y Componentes** | [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [Lucide Icons](https://lucide.dev/) | MIT / Open Source |
| **Pruebas y QA** | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) + JSDOM | MIT |
| **Linter & Formato** | [ESLint](https://eslint.org/) con `eslint-config-next` | MIT |
| **Gestor de Paquetes** | [pnpm v10](https://pnpm.io/) | MIT |

---

## 3. Requisitos del Sistema

- **Node.js:** `>= 20.x` (verificado con Node v24)
- **pnpm:** `>= 9.x / 10.x` (`corepack enable` o `npm i -g pnpm`)
- **Git**
- **Hardware mínimo:** Equipo con soporte para CPU estándar. No se requiere GPU dedicada ni tarjetas de crédito.

---

## 4. Instalación y Puesta en Marcha

Estado verificado del MVP y pendientes: [auditoría del 2026-10-11](docs/mvp-audit-2026-10-11.md). Los pagos y las reservas son simulados; el flujo completo no requiere cuentas comerciales.

### 4.1 Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd travel-mind
```

### 4.2 Configurar variables de entorno
Copiar la plantilla de entorno:
```bash
cp .env.example .env.local
```
> Las variables por defecto están preparadas para ejecución en `APP_MODE=demo` sin cuentas externas.

### 4.3 Instalar dependencias
```bash
pnpm install
pnpm workflows:setup
```

### 4.4 Levantar PostgreSQL, Mailpit y n8n locales
```bash
docker compose up -d postgres mailpit n8n
```

### 4.5 Ejecutar migraciones y seed de catálogo demostrativo
```bash
# Aplicar migraciones con Drizzle ORM
pnpm db:migrate

# Cargar catálogo de 14 experiencias demostrativas en Perú
pnpm db:seed
pnpm rag:index
```

### 4.6 Iniciar el servidor de desarrollo
```bash
pnpm dev --hostname 127.0.0.1
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000) y el catálogo en [http://localhost:3000/packages](http://localhost:3000/packages).

Para recomendaciones con modelos locales, opcionalmente iniciar Ollama y descargar los dos artefactos gratuitos antes de reindexar:

```bash
docker compose --profile ai up -d ollama
docker exec travelmind-ollama ollama pull qwen2.5:1.5b-instruct-q4_1
docker exec travelmind-ollama ollama pull nomic-embed-text:v1.5
pnpm rag:index --embed
```

Los seis workflows locales de `workflows/n8n/` (mantenimiento, consulta, cotización, reserva, notificaciones y excepciones) están **importados y activos cada cinco minutos** en esta instancia de desarrollo. El [manual de operación](docs/runbooks/operations.md) detalla importación, publicación y pruebas para una instalación nueva. Los cinco flujos de negocio procesan trabajo acotado después de las acciones del usuario; Next.js conserva la recomendación y las decisiones de precio, HITL, pago y reserva. El fallback determinista y `pnpm workflows:run` permiten demostrar el proceso sin Ollama ni n8n. Evaluar cuatro consultas ficticias contra el catálogo local: `pnpm ai:evaluate`.

---

## 5. Scripts de Validación y Calidad

El proyecto incluye scripts estandarizados para asegurar la integridad del código:

```bash
# Iniciar servidor de desarrollo (Next.js Turbopack)
pnpm dev

# Validar tipos estáticos con TypeScript
pnpm typecheck

# Ejecutar análisis estático con ESLint
pnpm lint

# Ejecutar suite de pruebas unitarias con Vitest
pnpm test

# Ejecutar pruebas en modo observador (watch)
pnpm test:watch

# Compilar build de producción
pnpm build

# Iniciar servidor de producción compilado
pnpm start

# Generar migraciones Drizzle desde el esquema
pnpm db:generate

# Ejecutar migraciones en PostgreSQL
pnpm db:migrate

# Ejecutar seeder demostrativo
pnpm db:seed
```

---

## 6. Endpoints de API

### `GET /api/packages`
Consulta paginada del catálogo turístico con filtros y búsqueda:
- **Parámetros opcionales:** `search`, `destinationId`, `category`, `minPriceMinor`, `maxPriceMinor`, `durationDays`, `sortBy` (`price`, `duration`, `title`, `createdAt`), `sortOrder` (`asc`, `desc`), `page`, `pageSize`.
- **Ejemplo:** `curl "http://localhost:3000/api/packages?category=aventura&pageSize=5"`

### `GET /api/packages/:id`
Consulta de un paquete específico por ID (UUID) o slug, incluyendo destino y variantes activas:
- **Ejemplo:** `curl "http://localhost:3000/api/packages/machu-picchu-magico-valle-sagrado"`

### `GET /api/health`
Verifica el estado operativo del servicio, política de gasto y adaptadores activos:
```bash
curl -s http://localhost:3000/api/health
```

Respuesta típica:
```json
{
  "status": "ok",
  "service": "travel-mind",
  "version": "0.1.0",
  "timestamp": "2026-10-10T15:57:37.230Z",
  "mode": "demo",
  "checks": {
    "budgetPolicy": "USD_0",
    "aiProvider": "ollama",
    "travelProvider": "mock",
    "paymentProvider": "mock"
  }
}
```

---

## 7. Estructura del Repositorio

```text
travel-mind/
├── AGENTS.md                   # Normas operativas y arquitectura global
├── docs/
│   ├── cost-matrix.md          # Matriz de recursos y restricciones de coste USD 0
│   └── adr/                    # Architecture Decision Records
│       └── 0001-fase-0-fundamentos-y-stack.md
├── src/
│   ├── app/                    # Next.js App Router (páginas, layouts y API routes)
│   │   ├── api/health/         # Endpoint de salud del sistema
│   │   ├── globals.css         # Configuración de diseño y tokens de color
│   │   ├── layout.tsx          # Layout raíz con Navbar, Footer y DemoBanner
│   │   └── page.tsx            # Página de inicio institucional y de diagnóstico
│   ├── components/
│   │   ├── ui/                 # Componentes base shadcn (Button, Card, Badge)
│   │   └── shared/             # Navbar, Footer y DemoBanner compartidos
│   ├── features/               # Módulos de dominio (catalog, chat, quotes, reservations)
│   ├── lib/                    # Utilidades de entorno (env) y de estilo (cn)
│   ├── server/                 # Contratos de proveedores (MockTravelProvider, MockPaymentProvider)
│   └── types/                  # Definiciones de tipos TypeScript globales
├── tests/
│   ├── api/                    # Pruebas de endpoints
│   ├── components/             # Pruebas de componentes de interfaz
│   └── setup.ts                # Configuración de entorno JSDOM y matchers
├── vitest.config.ts            # Configuración de Vitest con alias @/
└── package.json
```

---

## 8. Documentos de Referencia Obligatoria

- [`AGENTS.md`](./AGENTS.md): Reglas de negocio, seguridad, IA y directivas de desarrollo para agentes y programadores.
- [`docs/cost-matrix.md`](./docs/cost-matrix.md): Catálogo de tecnologías aprobadas y criterios de presupuesto cero.

## 9. Fase 1B: administración local y contenido aprobado

La interfaz de negocio utiliza navegación de paquetes/destinos y textos para viajeros y administradores. Se retiraron de las pantallas los avisos globales de demo, presupuesto, fases, arquitectura y enlaces de diagnóstico por solicitud del usuario. El entorno técnico conserva su configuración local; la ficha muestra tarifa referencial y reconfirmación de disponibilidad, sin presentar una cotización o reserva como realizada. Este ajuste no agrega dependencias ni cambia el esquema.

Verificación de este ajuste: portada y catálogo revisados en navegador; navegación con teclado y catálogo a 320 px sin desbordamiento horizontal. Se retiró la prueba del banner eliminado y se adaptaron las pruebas al vocabulario de negocio.

La gestión del catálogo y las aprobaciones están integradas en **Mi cuenta**. Todas las cuentas ingresan con usuario y contraseña en `/account`; no existe un apartado ni una contraseña compartida para administración. `/admin` y `/admin/approvals` redirigen a Mi cuenta.

El rol se consulta en PostgreSQL en cada operación: `customer` gestiona sus reservas, `admin` gestiona paquetes y aprobaciones, `approver` revisa aprobaciones. `travel_agent` está reservado para atención de casos, todavía no implementada. Las páginas y las API validan permisos en servidor. El registro público siempre crea `customer` y rechaza campos de rol.

Para habilitar una cuenta existente del personal en el entorno local:

```bash
pnpm db:migrate
pnpm account:role nombre_usuario admin # O approver / travel_agent / customer
```

La cuenta se crea primero desde Mi cuenta. El comando requiere acceso local al proyecto/base de datos, no está expuesto por HTTP y revoca las sesiones de la cuenta modificada. Después se ingresa nuevamente con las mismas credenciales. No se elevan cuentas automáticamente. Las antiguas cookies `travelmind_admin` no conceden permisos; `/api/admin/session` responde 410.

Contratos nuevos (éxito `{ data }`; error `{ error: { code, message, correlationId } }`):

| Método / ruta | Entrada / resultado |
|---|---|
| POST `/api/customer/session` | `{ action, username, password }`; cuenta y rol; cookie común |
| GET / DELETE `/api/customer/session` | Consultar cuenta y rol / revocar sesión |
| GET `/api/admin/packages?page=1` | Hasta 20 paquetes, incluyendo archivados |
| POST `/api/admin/packages` | Campos estrictos de `adminPackageSchema`; 201 |
| PATCH `/api/admin/packages/:id` | Mismos campos completos + `expectedUpdatedAt`; 409 si cambió |

La edición reemplaza los campos del paquete, registra auditoría y crea una versión documental en la misma transacción. `catalog_documents` guarda fuente, idioma, ACL pública, hash, responsable y fecha. Solo la versión aprobada de un paquete activo es recuperable; las anteriores se marcan `superseded`. Los documentos omiten tarifas y cupos. Son la base del RAG implementado en la fase 2; los detalles actuales están en docs/recommendations-quotes.md. La publicación inicial de datos demo no modifica precios ni afirma disponibilidad real.

Pruebas con PostgreSQL separado (no usa cuentas externas):

```bash
docker exec travelmind-postgres createdb -U postgres travelmind_admin_test # Solo la primera vez
pnpm test:integration
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

La configuración de integración fija `localhost/travelmind_admin_test`, migra las tablas y elimina únicamente sus fixtures. La migración nueva agrega `admin_sessions`, `catalog_documents`, `audit_logs` y constraints de precio/duración. Rollback de desarrollo: `src/server/db/rollbacks/0001-admin.sql`; retirar el código de esta fase antes de revertir y conservar un respaldo si existe historial necesario. No ejecutar el rollback en una base compartida.

Fase 2 implementada: asistente en /chat, recomendaciones con fuentes, búsqueda determinista, adaptador Ollama local, índice pgvector y cotizaciones privadas de 24 horas. Consulta [el manual de recomendaciones y cotizaciones](docs/recommendations-quotes.md). Ollama y los modelos no están instalados en el entorno verificado; se probó el fallback real y el adaptador mediante respuestas controladas. Siguiente fase: reserva, autenticación de clientes, revalidación, HITL y pago local simulado.

Verificación del 2026-10-10: `pnpm test` (29 pruebas), `pnpm test:integration` (8 pruebas), `pnpm typecheck`, `pnpm lint` y `pnpm build` exitosos. Migración aplicada a PostgreSQL local; rollback y reaplicación comprobados exclusivamente en `travelmind_admin_test`. Navegador: acceso y guardado con teclado, foco al abrir editor y revisión a 320 px sin desbordamiento horizontal del documento. No constituye auditoría completa WCAG. No hay aún script Playwright E2E ni recorrido de reserva/pago completo.

Verificación fase 2 (2026-10-10): 39 pruebas unitarias/componentes y 16 de integración exitosas; lint, typecheck y build correctos. Recorrido de navegador recomendación → fuente → cotización comprobado con teclado y a 320 px. Migración 0002 aplicada localmente; rollback y reaplicación probados solo en la base de test. Contrato OpenAPI disponible en docs/openapi-phase2.json. Inferencia real con Ollama pendiente de instalar los modelos; fallback determinista operativo.

Fase 3 implementada: cuenta de cliente, reserva privada con revalidación/consentimiento, HITL para total > USD 2000, pago local con evento verificado, comprobante del proveedor mock, reversión pendiente y notificaciones recuperables. [Manual de reservas y pagos](docs/reservations-payments.md). Mailpit local se inicia con `docker compose up -d mailpit`; `pnpm workflows:run` procesa la cola y las reversiones. La importación y ejecución local de n8n se comprobaron después; su estado actual está en la [auditoría del MVP](docs/mvp-audit-2026-10-11.md). No hay cargos ni reservas externas. Siguiente fase: operación, métricas, alertas y robustez.

Verificación fase 3 (2026-10-10): 44 pruebas unitarias/componentes y 29 de integración correctas; lint, typecheck y build exitosos. `pnpm test:smoke` verifica el recorrido HTTP contra la app local y deja registros ficticios de QA; navegador validado desde cotización hasta confirmación de prueba, con aceptación por teclado y reserva a 320 px sin desbordamiento. Mailpit recibió los mensajes de los recorridos locales. Migración 0003 aplicada; rollback/reaplicación comprobados solo en la base desechable de tests. Contrato OpenAPI: docs/openapi-phase3.json. La revisión de accesibilidad fue puntual; no se ejecutaron Playwright ni n8n.

Mejora del login (2026-10-10): formulario prioritario en móvil, panel de marca en escritorio, mostrar/ocultar contraseña, confirmación al registrar, usuario normalizado y retorno limitado a cotizaciones/reservas internas. Los fallos de conexión permiten reintentar la comprobación de sesión; errores anunciados y enfocados. Sin dependencias, cambios de esquema ni cambios al contrato HTTP de autenticación. Verificación: 49 pruebas unitarias/componentes, lint, typecheck y build correctos; ingreso y salida con cuenta ficticia comprobados mediante teclado en navegador. No se agregó recuperación de contraseña ni proveedor externo.

Actualización de acceso por roles: migración `0004_long_firestar.sql` amplía los roles permitidos conservando las cuentas. Rollback `src/server/db/rollbacks/0004-account-roles.sql` exige que todas las cuentas vuelvan a customer antes de revertir. Sin nuevas dependencias ni servicios.
Verificación de acceso por roles: 52 pruebas unitarias/componentes y 29 de integración PostgreSQL correctas; lint, typecheck y build correctos. Navegador: login común con cuenta ficticia admin, gestión de paquetes sin segundo acceso, cierre de sesión y redirección segura desde /admin y desde catálogo sin sesión. Cuenta temporal eliminada al terminar.

## Operación y robustez: resumen operativo

Mi cuenta incorpora Resumen operativo para el rol admin. Muestra conteos persistidos, estados y alertas locales con actualización manual, vacío, error y aviso de datos anteriores. Mantiene la administración integrada por roles. No añade proveedores, dependencias ni migraciones. Manual, criterios y límites: [docs/runbooks/operations.md](docs/runbooks/operations.md). API: GET `/api/admin/metrics`, contrato en `docs/openapi-phase4.json`.
Verificación del incremento operativo: 56 pruebas unitarias/componentes y 30 de integración, lint, typecheck y build correctos; navegación con teclado y vista de 320 px comprobadas.

## Pruebas de navegador y carga

`pnpm test:e2e` compila y ejecuta cuatro recorridos en Chromium con una app en localhost:3100 y PostgreSQL exclusivo `travelmind_e2e_test`. Esa base es desechable y se limpia antes del seed y después de las operaciones de QA; no contiene datos del usuario. Incluye fallback, confirmación simulada, vencimiento, permisos, rechazo de aprobación e aislamiento entre cuentas. Tras la descarga inicial funciona sin servicios externos.

`pnpm test:load` mide solo lecturas locales del catálogo de la app iniciada: 100 solicitudes, concurrencia 5, límites configurables. Informe con hardware y condiciones: [docs/testing/browser-and-load.md](docs/testing/browser-and-load.md), resultado JSON en `docs/testing/catalog-load-result.json`. No acredita capacidad de producción.

Operación de incidencias: desde **Mi cuenta → Incidencias de reservas**, con rol admin. Consultar [operación local](docs/runbooks/operations.md) y [retención de datos](docs/runbooks/data-retention.md). La cola permite consulta paginada, asignación y atención acotada por roles. `pnpm workflows:run` aplica la retención y las reversiones simuladas verificadas.

La atención de incidencias admite asignación por admin y acciones por el agente asignado. Permite notas y cierre de revisiones por cambio de tarifa sin pagos pendientes/verificados; no habilita confirmaciones forzadas. Aplicar las migraciones locales con pnpm db:migrate.
