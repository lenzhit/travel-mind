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