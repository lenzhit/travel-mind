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
```

### 4.4 Levantar PostgreSQL local con pgvector (Docker Compose)
```bash
docker compose up -d
```

### 4.5 Ejecutar migraciones y seed de catálogo demostrativo
```bash
# Aplicar migraciones con Drizzle ORM
pnpm db:migrate

# Cargar catálogo de 14 experiencias demostrativas en Perú
pnpm db:seed
```

### 4.6 Iniciar el servidor de desarrollo
```bash
pnpm dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000) y el catálogo en [http://localhost:3000/packages](http://localhost:3000/packages).

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

El catálogo público de la fase 1A se amplió con `/admin`: listar, crear, editar y archivar paquetes. Archivar es reversible mediante el selector de publicación. El precio se ingresa en centavos USD; las variantes existentes se conservan. El seed ahora agrega datos faltantes sin borrar cambios ni auditorías.

Preparación desde una terminal WSL:

```bash
pnpm db:migrate
pnpm db:publish-demo # Aprobar la primera versión del catálogo demo existente; idempotente
pnpm admin:password # Entrada oculta; genera un hash scrypt con salt aleatorio
```

Copiar únicamente la línea `ADMIN_PASSWORD_HASH=...` generada a `.env.local` (no al repositorio) y reiniciar `pnpm dev`. Abrir `http://localhost:3000/admin` e ingresar la contraseña elegida. El acceso permanece deshabilitado hasta configurar el hash. No existe contraseña predeterminada.

Sesión opaca de una hora, guardada en PostgreSQL como hash; cookie HttpOnly y SameSite Strict (Secure bajo HTTPS). Cerrar sesión revoca el token. Todas las rutas administrativas exigen rol `admin` en servidor. Las mutaciones exigen Origin del mismo sitio, JSON estricto y máximo 64 KiB; login permite diez intentos por minuto y proceso. Esta identidad `local-admin` es exclusiva de demo y no implementa aún usuarios/customer, MFA ni control distribuido. Iniciar la demo enlazada a loopback: `pnpm dev --hostname 127.0.0.1`.

Contratos nuevos (éxito `{ data }`; error `{ error: { code, message, correlationId } }`):

| Método / ruta | Entrada / resultado |
|---|---|
| POST `/api/admin/session` | `{ password }`; cookie de sesión |
| GET / DELETE `/api/admin/session` | Consultar sesión / revocarla |
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